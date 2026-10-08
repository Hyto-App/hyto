import assert from "node:assert/strict";
import test from "node:test";
import { brutoFondado, montoRecibido, recibidoDeCampos } from "./recibido";

test("12.48 fondeados llegan como 12.44256 después de la comisión del 0.3%", () => {
  assert.equal(montoRecibido("12.48"), "12.44256");
  assert.equal(montoRecibido("12.48", 0n), "12.44256");
  assert.equal(montoRecibido("20"), "19.94");
  assert.equal(montoRecibido("15"), "14.955");
});

test("el reembolso pagado usa el monto confirmado, no el tope", () => {
  const tarea = { tipo: "reembolso" as const, monto: "15", tope: "15" };
  assert.equal(brutoFondado(tarea, "12.48"), "12.48");
  assert.equal(brutoFondado(tarea, null), null);
  assert.equal(recibidoDeCampos({ ...tarea, montoConfirmado: "12.48" }), "12.44256");
  assert.equal(recibidoDeCampos({ ...tarea, montoPagado: "12.44256", montoConfirmado: "12.48" }), "12.44256");
  assert.equal(recibidoDeCampos(tarea), null);
});

test("un trabajo pagado descuenta la misma comisión del monto del hito", () => {
  assert.equal(recibidoDeCampos({ tipo: "trabajo", monto: "20", tope: null }), "19.94");
  assert.equal(recibidoDeCampos({ tipo: "trabajo", monto: "20", tope: "99", montoPagado: "19.94" }), "19.94");
});
