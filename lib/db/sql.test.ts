import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sentencias } from "./sql";

test("la migración crea las tablas del backend", () => {
  const sql = readFileSync("drizzle/0000_inicio.sql", "utf8");
  const orden = sentencias(sql).join("\n");
  for (const tabla of ["usuarios", "proyectos", "tareas", "evidencias", "veredictos", "sesiones"]) {
    assert.match(orden, new RegExp(`CREATE TABLE IF NOT EXISTS ${tabla}`));
  }
  assert.match(orden, /hash_pago/);
  assert.match(orden, /blob_id/);
});
