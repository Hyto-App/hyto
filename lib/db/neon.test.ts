import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { cerrarPools, crearAlmacenDesde, crearAlmacenNeon, esTablaAusente, type DbAlmacen } from "./neon";

test("el pool local escucha error sin cerrar el proceso", async () => {
  const url = "postgres://hyto:hyto@127.0.0.1:1/hyto";
  crearAlmacenNeon(url);
  const pool = (globalThis as { __hytoPools?: Map<string, Pool> }).__hytoPools?.get(url);
  assert.ok(pool);
  assert.equal(pool.listenerCount("error") > 0, true);
  const original = console.error;
  const mensajes: string[] = [];
  console.error = (...args: unknown[]) => {
    mensajes.push(args.map(String).join(" "));
  };
  try {
    pool.emit("error", new Error("conexión ociosa caída"));
  } finally {
    console.error = original;
  }
  assert.equal(mensajes.length, 1);
  assert.match(mensajes[0] ?? "", /conexión ociosa caída/);
  await cerrarPools();
  assert.equal((globalThis as { __hytoPools?: Map<string, Pool> }).__hytoPools?.size ?? 0, 0);
});

const FONDEO = { tareaId: "stand", contrato: "CSTAND", hash: "ab".repeat(32), creadoEn: "2026-10-07T00:00:00.000Z" };

// Only what the fund marker touches: the probe, one select chain and one insert chain.
function dbDeFondeo(sonda: () => Promise<unknown>, filas: unknown[] = []) {
  const visto = { sondas: 0, selects: 0, inserts: [] as unknown[] };
  const consulta = { from: () => consulta, where: () => consulta, limit: async () => filas };
  const db = {
    execute: async () => {
      visto.sondas += 1;
      return sonda();
    },
    select: () => {
      visto.selects += 1;
      return consulta;
    },
    insert: () => ({
      values: (valores: unknown) => ({
        onConflictDoNothing: async () => {
          visto.inserts.push(valores);
        },
      }),
    }),
  } as unknown as DbAlmacen;
  return { db, visto };
}

const SIN_TABLA = Object.assign(new Error('relation "fondeos_escrow" does not exist'), { code: "42P01" });

test("before 0008 is applied the fund marker reads as absent and storing it is a quiet no", async () => {
  const { db, visto } = dbDeFondeo(async () => {
    throw SIN_TABLA;
  });
  const almacen = crearAlmacenDesde(db);
  assert.equal(await almacen.leerFondeo("stand"), null);
  assert.equal(await almacen.guardarFondeo(FONDEO), false);
  assert.equal(visto.selects, 0);
  assert.deepEqual(visto.inserts, []);
  // A missing table is not cached: the same store starts keeping markers once the file is applied.
  assert.equal(visto.sondas, 2);
});

test("drizzle wraps the Postgres error, and the missing table is still found on the cause", async () => {
  const envuelto = Object.assign(new Error("Failed query: select tarea_id from fondeos_escrow limit 0"), { cause: SIN_TABLA });
  assert.equal(esTablaAusente(envuelto), true);
  const { db } = dbDeFondeo(async () => {
    throw envuelto;
  });
  assert.equal(await crearAlmacenDesde(db).leerFondeo("stand"), null);
});

test("after 0008 is applied the fund marker is read and stored, and the probe runs once", async () => {
  const { db, visto } = dbDeFondeo(async () => [], [FONDEO]);
  const almacen = crearAlmacenDesde(db);
  assert.deepEqual(await almacen.leerFondeo("stand"), FONDEO);
  assert.equal(await almacen.guardarFondeo(FONDEO), true);
  assert.equal(await almacen.leerFondeo("stand"), FONDEO);
  assert.deepEqual(visto.inserts, [FONDEO]);
  assert.equal(visto.sondas, 1);
});

test("any other database failure still surfaces instead of hiding the marker", async () => {
  const caida = new Error("Failed query: select tarea_id from fondeos_escrow limit 0", { cause: new Error("connection reset") });
  assert.equal(esTablaAusente(caida), false);
  assert.equal(esTablaAusente(new Error('column "sha256" does not exist')), false);
  const { db } = dbDeFondeo(async () => {
    throw caida;
  });
  const almacen = crearAlmacenDesde(db);
  await assert.rejects(almacen.leerFondeo("stand"), /Failed query/);
  await assert.rejects(almacen.guardarFondeo(FONDEO), /Failed query/);
});
