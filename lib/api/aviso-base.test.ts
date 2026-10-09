import assert from "node:assert/strict";
import test from "node:test";
import {
  AVISO_BASE_CONEXION,
  AVISO_BASE_CONFIG,
  AVISO_BASE_ESQUEMA,
  AVISO_BASE_OTRA,
  clasificarFalloBase,
  detalleErrorBase,
} from "./aviso-base";

test("una columna o tabla ausente es una migración, no un corte de red", () => {
  const columna = Object.assign(new Error('column "comunidad_id" of relation "proyectos" does not exist'), { code: "42703" });
  assert.deepEqual(clasificarFalloBase(columna), { clase: "esquema", aviso: AVISO_BASE_ESQUEMA, status: 503 });
  const tabla = Object.assign(new Error('relation "comunidades" does not exist'), { code: "42P01" });
  assert.equal(clasificarFalloBase(tabla)?.clase, "esquema");
});

test("un corte de red no se informa como esquema", () => {
  const error = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" });
  assert.deepEqual(clasificarFalloBase(error), { clase: "conexion", aviso: AVISO_BASE_CONEXION, status: 503 });
  assert.match(detalleErrorBase(error), /ECONNREFUSED/);
});

test("la base sin configurar y otro error SQL no comparten aviso", () => {
  assert.equal(clasificarFalloBase(new Error("The database is not configured."))?.aviso, AVISO_BASE_CONFIG);
  const catalogo = Object.assign(new Error("database \"hyto\" does not exist"), { code: "3D000" });
  assert.equal(clasificarFalloBase(catalogo)?.aviso, AVISO_BASE_OTRA);
  const unico = Object.assign(new Error("duplicate key"), { code: "23505" });
  assert.equal(clasificarFalloBase(unico)?.clase, "base");
});

test("un fallo de programa no es un fallo de base, y el registro no lleva secretos", () => {
  const secreto = "postgres://hyto:super-secret@db.internal/hyto";
  const error = new TypeError(`Cannot read properties of undefined (${secreto}) for ana@example.com`);
  assert.equal(clasificarFalloBase(error), null);
  const texto = detalleErrorBase(error);
  assert.equal(texto.includes("super-secret"), false);
  assert.equal(texto.includes("ana@example.com"), false);
  assert.match(texto, /postgres:\/\/redacted/);
});
