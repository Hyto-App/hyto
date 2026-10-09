import assert from "node:assert/strict";
import test from "node:test";
import { navegadorPuedeCrearPasskey } from "./soportePasskey";

test("sin WebAuthn no se ofrece la llave de acceso", () => {
  assert.equal(navegadorPuedeCrearPasskey(null), false);
  assert.equal(navegadorPuedeCrearPasskey({ crear: false, contextoSeguro: true }), false);
});

test("un contexto inseguro no puede crear la llave", () => {
  assert.equal(navegadorPuedeCrearPasskey({ crear: true, contextoSeguro: false }), false);
});

test("WebAuthn en un contexto seguro alcanza, aunque no haya autenticador de plataforma", () => {
  // Linux Chrome de escritorio, con o sin el autenticador virtual: no hay plataforma,
  // y Cavos igual deja crear la llave sin authenticatorAttachment.
  assert.equal(navegadorPuedeCrearPasskey({ crear: true, contextoSeguro: true }), true);
});
