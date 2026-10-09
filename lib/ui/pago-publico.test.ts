import assert from "node:assert/strict";
import test from "node:test";
import { enlacePagoPublico, hayPagoPublico, HASH_PAGO_PUBLICO } from "./pago-publico";

test("sin hash real no hay enlace público inventado", () => {
  assert.equal(HASH_PAGO_PUBLICO, "");
  assert.equal(hayPagoPublico(), false);
  assert.equal(enlacePagoPublico(), null);
});
