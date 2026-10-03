import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { cerrarPools, crearAlmacenDesde, crearAlmacenNeon, type DbAlmacen } from "./neon";

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

function dbQueFalla(error: Error): DbAlmacen {
  const cadena = (): unknown =>
    new Proxy(() => {}, {
      get: (_objetivo, clave) => (clave === "then" ? (_ok: unknown, mal: (motivo: unknown) => void) => mal(error) : cadena),
      apply: () => cadena(),
    });
  return { select: cadena, insert: cadena } as unknown as DbAlmacen;
}

test("antes de aplicar 0006 la marca de fondeo se lee como ausente y no corta el envío", async () => {
  const sinTabla = Object.assign(new Error('relation "fondeos_escrow" does not exist'), { code: "42P01" });
  const almacen = crearAlmacenDesde(dbQueFalla(sinTabla));
  assert.equal(await almacen.leerFondeo("stand"), null);
  assert.equal(
    await almacen.guardarFondeo({ tareaId: "stand", contrato: "C", hash: "ab".repeat(32), creadoEn: "2026-10-03T00:00:00.000Z" }),
    false,
  );
  const caida = crearAlmacenDesde(dbQueFalla(new Error("connection reset")));
  await assert.rejects(caida.leerFondeo("stand"), /connection reset/);
});
