import assert from "node:assert/strict";
import test from "node:test";
import { acortarDireccion, formatearFecha, formatearMonto, montoDeTarea } from "./formato";

test("montos y fechas del integrante", () => {
  assert.equal(formatearMonto("20"), "US$20");
  assert.equal(formatearMonto("12.40"), "US$12.40");
  assert.equal(formatearFecha("2026-09-27"), "27 sept 2026");
  assert.equal(
    montoDeTarea({ tipo: "reembolso", monto: "15", tope: "15" }),
    "Hasta US$15",
  );
  assert.equal(acortarDireccion("GABCDE1234567890WXYZ"), "GABCDE…WXYZ");
});
