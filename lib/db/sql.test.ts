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

test("0010 solo agrega tablas y una columna nullable, antes de 0011, 0012 y 0013", () => {
  const archivos = readdirSync("drizzle")
    .filter((nombre) => nombre.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
  const indice = archivos.indexOf("0010_comunidades.sql");
  assert.deepEqual(archivos.slice(indice, indice + 4), [
    "0010_comunidades.sql",
    "0011_tipo_cuenta.sql",
    "0012_perfil_voluntario.sql",
    "0013_tablon.sql",
  ]);
  const sql = readFileSync("drizzle/0010_comunidades.sql", "utf8");
  const orden = sentencias(sql);
  assert.deepEqual(
    orden.map((sentencia) => sentencia.split("(")[0]?.trim()),
    [
      "CREATE TABLE IF NOT EXISTS comunidades",
      "CREATE TABLE IF NOT EXISTS comunidad_miembros",
      "CREATE TABLE IF NOT EXISTS comunidad_solicitudes",
      "ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS comunidad_id text REFERENCES comunidades",
    ],
  );
  assert.match(orden[3] ?? "", /ON DELETE SET NULL$/);
  assert.equal(orden[3]?.includes("NOT NULL"), false);
  const ejecutables = orden.join("\n");
  assert.doesNotMatch(ejecutables, /\b(DROP|TRUNCATE|UPDATE|INSERT)\b/i);
  assert.doesNotMatch(ejecutables.replace(/\bON DELETE\b/gi, ""), /\bDELETE\b/i);
});
