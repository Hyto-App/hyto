import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { sentencias } from "./sql";

const ARCHIVO = "drizzle/0010_organizaciones.sql";

test("la migración de organizaciones solo agrega y cada sentencia se puede correr dos veces", () => {
  const lista = sentencias(readFileSync(ARCHIVO, "utf8"));
  // Three tables, three indexes, and the column on proyectos.
  assert.equal(lista.length, 7);
  for (const sentencia of lista) {
    const normal = sentencia.replace(/\s+/g, " ");
    assert.match(
      normal,
      /^(CREATE TABLE IF NOT EXISTS |CREATE INDEX IF NOT EXISTS |ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS )/i,
      normal,
    );
    // ON DELETE CASCADE is a foreign key action, not a delete.
    assert.doesNotMatch(normal, /\b(drop|truncate|update|insert|rename)\b|(?<!ON )\bdelete\b/i, normal);
  }
});

test("la migración deja el correo en minúsculas y el origen acotado en la base", () => {
  const sql = readFileSync(ARCHIVO, "utf8");
  assert.match(sql, /CHECK \(email = lower\(email\)\)/);
  assert.match(sql, /CHECK \(origen IN \('manual', 'evento', 'invitacion'\)\)/);
  assert.match(sql, /PRIMARY KEY \(organizacion_id, email\)/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS organizacion_id text REFERENCES organizaciones \(id\) ON DELETE SET NULL/);
});

test("drizzle/ no tiene nada de Comunidades ni del tablón, y la limpieza manual vive fuera", () => {
  const archivos = readdirSync("drizzle").filter((nombre) => nombre.endsWith(".sql"));
  assert.equal(archivos.includes("0010_comunidades.sql"), false);
  assert.equal(archivos.includes("0013_tablon.sql"), false);
  assert.equal(archivos.filter((nombre) => nombre.startsWith("0010_")).length, 1);
  for (const nombre of archivos) {
    const sql = readFileSync(`drizzle/${nombre}`, "utf8");
    assert.doesNotMatch(sql, /comunidad/i, nombre);
  }
  assert.doesNotMatch(readFileSync(ARCHIVO, "utf8"), /\bdrop\b/i);
  assert.equal(existsSync("scripts/sql/limpiar-comunidades.sql"), true);
  const limpieza = readFileSync("scripts/sql/limpiar-comunidades.sql", "utf8");
  assert.match(limpieza, /RAISE EXCEPTION 'Communities tables have data: nothing was dropped\.'/);
  assert.match(limpieza, /to_regclass\('public\.comunidades'\) IS NULL/);
});
