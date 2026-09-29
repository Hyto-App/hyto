import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { cerrarPools, crearAlmacenNeon } from "./neon";

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
