import assert from "node:assert/strict";
import test from "node:test";
import { debeProvisionar, guardarIntencion, intencionDe, leerIntencion, olvidarIntencion } from "./intencion";

test("solo Sign up con el permiso del servidor aprovisiona testnet", () => {
  assert.equal(debeProvisionar("signup", true), true);
  assert.equal(debeProvisionar("signup", false), false);
  assert.equal(debeProvisionar("signin", true), false);
  assert.equal(debeProvisionar("signin", false), false);
  assert.equal(intencionDe("signup"), "signup");
  assert.equal(intencionDe("signin"), "signin");
  assert.equal(intencionDe("register"), null);
  assert.equal(intencionDe(undefined), null);
});

test("si no hay una intención guardada, el regreso de Google se trata como Sign in", () => {
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
  assert.equal(leerIntencion(almacenamiento), "signin");
  guardarIntencion("signup", almacenamiento);
  assert.equal(leerIntencion(almacenamiento), "signup");
  olvidarIntencion(almacenamiento);
  assert.equal(leerIntencion(almacenamiento), "signin");
  guardarIntencion("signin", almacenamiento);
  assert.equal(leerIntencion(almacenamiento), "signin");
});
