import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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

test("un punto y coma dentro de un comentario no parte la sentencia", () => {
  const sql = "-- Apply after 0007; never from CI.\nALTER TABLE tareas ADD COLUMN IF NOT EXISTS x text; -- note; more\nCREATE INDEX IF NOT EXISTS i ON tareas (x);\n";
  assert.deepEqual(sentencias(sql), ["ALTER TABLE tareas ADD COLUMN IF NOT EXISTS x text", "CREATE INDEX IF NOT EXISTS i ON tareas (x)"]);
});

test("cada migración se puede volver a correr: el aplicador no guarda cuáles ya corrió", () => {
  const idempotente = /^(CREATE TABLE IF NOT EXISTS|CREATE (UNIQUE )?INDEX IF NOT EXISTS|ALTER TABLE \w+ ADD COLUMN IF NOT EXISTS|INSERT INTO [\s\S]+ON CONFLICT [\s\S]+DO NOTHING$)/;
  for (const nombre of readdirSync("drizzle").filter((archivo) => archivo.endsWith(".sql"))) {
    for (const sentencia of sentencias(readFileSync(`drizzle/${nombre}`, "utf8"))) {
      assert.match(sentencia, idempotente, `${nombre}: ${sentencia.slice(0, 80)}`);
    }
  }
});
