import assert from "node:assert/strict";
import test from "node:test";
import { cifraConfirmada, montoDentroDelTope, validarMontoConfirmado } from "./monto";

test("a receipt above the cap is clamped to the cap and a lower amount is kept", () => {
  assert.equal(montoDentroDelTope("15.74", "15", "15"), "15");
  assert.equal(montoDentroDelTope("15", "15", "15"), "15");
  assert.equal(montoDentroDelTope("10.5", "15", "15"), "10.50");
  assert.equal(montoDentroDelTope("0", "15", "15"), null);
  assert.equal(montoDentroDelTope("no", "15", "15"), null);
  assert.deepEqual(validarMontoConfirmado("15.74", "15", "15"), { monto: "15" });
  assert.deepEqual(validarMontoConfirmado(16, "15", "15"), { monto: "15" });
  assert.equal(cifraConfirmada("15.74", "15", "15"), null);
  assert.equal(cifraConfirmada("15", "15", "15"), 15);
});
