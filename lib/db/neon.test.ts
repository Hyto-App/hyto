import assert from "node:assert/strict";
import test from "node:test";
import { drizzle as drizzleProxy } from "drizzle-orm/pg-proxy";
import type { Pool } from "pg";
import { cerrarPools, crearAlmacenDesde, crearAlmacenNeon, type DbAlmacen } from "./neon";

// Testnet-shaped placeholder, not a real account.
const CUENTA = "G" + "K".repeat(55);

test("con 0016 la cuenta de cobro va en usuarios.wallet_cobro, y leer un usuario no la nombra", async () => {
  const filas: Record<string, unknown>[] = [{ id: "u-1", email: "ana@hyto.app", nombre: "Ana", rol: "voluntario", wallet_cobro: null }];
  const consultas: string[] = [];
  const db = drizzleProxy(async (consulta, params) => {
    consultas.push(consulta);
    const texto = consulta.replace(/\s+/g, " ").toLowerCase();
    if (texto.startsWith('update "usuarios" set "wallet_cobro" = $1 where "usuarios"."id" = $2 returning')) {
      const fila = filas.find((item) => item.id === params[1]);
      if (!fila) return { rows: [] };
      fila.wallet_cobro = params[0];
      return { rows: [[fila.id]] };
    }
    if (/^select (?:"usuarios"\.)?"wallet_cobro" from "usuarios" where "usuarios"\."id" = \$1/.test(texto)) {
      const fila = filas.find((item) => item.id === params[0]);
      return { rows: fila ? [[fila.wallet_cobro]] : [] };
    }
    if (texto.startsWith("select") && texto.includes('from "usuarios"')) {
      return { rows: filas.map((fila) => [fila.id, fila.email, fila.nombre, fila.rol]) };
    }
    throw new Error(`consulta inesperada: ${consulta}`);
  });
  const almacen = crearAlmacenDesde(db as unknown as DbAlmacen);
  assert.equal(await almacen.walletCobroDeUsuario("u-1"), null);
  assert.equal(await almacen.guardarWalletCobro("u-1", CUENTA), true);
  assert.equal(await almacen.guardarWalletCobro("u-2", CUENTA), false);
  assert.equal(await almacen.walletCobroDeUsuario(" u-1 "), CUENTA);
  assert.equal(filas[0]?.wallet_cobro, CUENTA);
  assert.equal(await almacen.walletCobroDeUsuario(""), null);

  const antes = consultas.length;
  const leido = await almacen.leerUsuario("u-1");
  const todos = await almacen.listarUsuarios();
  assert.equal(leido?.email, "ana@hyto.app");
  assert.equal(leido?.walletCobro, undefined);
  assert.equal(todos[0]?.walletCobro, undefined);
  assert.doesNotMatch(consultas.slice(antes).join("\n"), /wallet_cobro/);
});

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
