import assert from "node:assert/strict";
import test from "node:test";
import { leerCookie } from "../../lib/sesion/cookie";
import { cookieDesdeToken, firmarTokenPrueba, macValida } from "./sesion-prueba";

test("la cookie de prueba se arma con la clave local y el lector de la app", () => {
  const clave = "hyto-prueba-sesion-local";
  const firmado = firmarTokenPrueba("token-opaco", clave);
  assert.equal(macValida(firmado, clave), true);
  assert.equal(macValida(firmado, "otra-clave"), false);
  const cookie = cookieDesdeToken(firmado);
  const leido = leerCookie(new Request("http://local/api/proyectos", { headers: { cookie } }), "hyto_sesion");
  assert.equal(leido, firmado);
});
