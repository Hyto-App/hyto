import assert from "node:assert/strict";
import test from "node:test";
import { destinoConfiguracion } from "./configuracion";

test("la cuenta vieja conserva la consulta y el ancla de la llave", () => {
  assert.equal(destinoConfiguracion("", ""), "/configuracion");
  assert.equal(destinoConfiguracion("?add=passkey", "#passkey"), "/configuracion?add=passkey#passkey");
  assert.equal(destinoConfiguracion("add=passkey", "passkey"), "/configuracion?add=passkey#passkey");
});
