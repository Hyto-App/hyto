import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_BASE_SESION } from "../auth/errores";
import {
  CLAVE_RETORNO,
  DESTINO_TRAS_INGRESO,
  avisoDeErrorUrl,
  destinoTrasIngreso,
  guardarRetorno,
  leerRetorno,
  olvidarRetorno,
  rutaRetornoSegura,
  urlSignin,
} from "./retorno";

test("rutaRetornoSegura only allows relative in-app paths", () => {
  assert.equal(rutaRetornoSegura("/join/ABC"), "/join/ABC");
  assert.equal(rutaRetornoSegura("/mis-tareas"), "/mis-tareas");
  assert.equal(rutaRetornoSegura("/join/ABC?x=1"), "/join/ABC?x=1");
  assert.equal(rutaRetornoSegura("  /eventos  "), "/eventos");
  assert.equal(rutaRetornoSegura("/"), "/");
});

test("rutaRetornoSegura rejects open redirects and unsafe values", () => {
  assert.equal(rutaRetornoSegura("//evil.com"), null);
  assert.equal(rutaRetornoSegura("//evil.com/phish"), null);
  assert.equal(rutaRetornoSegura("https://evil.com"), null);
  assert.equal(rutaRetornoSegura("http://evil.com/join"), null);
  assert.equal(rutaRetornoSegura("javascript:alert(1)"), null);
  assert.equal(rutaRetornoSegura("/\\evil.com"), null);
  assert.equal(rutaRetornoSegura("/@evil"), null);
  assert.equal(rutaRetornoSegura("join/ABC"), null);
  assert.equal(rutaRetornoSegura(""), null);
  assert.equal(rutaRetornoSegura(null), null);
  assert.equal(rutaRetornoSegura(undefined), null);
  assert.equal(rutaRetornoSegura(1), null);
  assert.equal(rutaRetornoSegura("//"), null);
});

test("urlSignin carries a validated next path", () => {
  assert.equal(urlSignin(), "/?signin=1");
  assert.equal(urlSignin(null), "/?signin=1");
  assert.equal(urlSignin("//evil.com"), "/?signin=1");
  assert.equal(urlSignin("/join/ABC"), "/?signin=1&next=%2Fjoin%2FABC");
});

test("destinoTrasIngreso falls back when next is missing or unsafe", () => {
  assert.equal(destinoTrasIngreso("/join/CODE"), "/join/CODE");
  assert.equal(destinoTrasIngreso("//evil.com"), DESTINO_TRAS_INGRESO);
  assert.equal(destinoTrasIngreso(null), DESTINO_TRAS_INGRESO);
  assert.equal(destinoTrasIngreso(undefined, "/"), "/");
});

test("el retorno de OAuth se guarda en sessionStorage y se valida al leer", () => {
  const memoria = new Map<string, string>();
  const almacenamiento = {
    getItem: (clave: string) => memoria.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      memoria.set(clave, valor);
    },
    removeItem: (clave: string) => {
      memoria.delete(clave);
    },
  };
  guardarRetorno("//evil.com", almacenamiento);
  assert.equal(memoria.has(CLAVE_RETORNO), false);
  guardarRetorno("/join/XYZ", almacenamiento);
  assert.equal(leerRetorno(almacenamiento), "/join/XYZ");
  olvidarRetorno(almacenamiento);
  assert.equal(leerRetorno(almacenamiento), null);
});

test("default signed-in landing matches Google (Events via /)", () => {
  assert.equal(DESTINO_TRAS_INGRESO, "/");
  assert.equal(destinoTrasIngreso(null), "/");
});
