import assert from "node:assert/strict";
import test from "node:test";
import { acortarDireccion, formatearFecha, formatearMonto, montoDeTarea } from "./formato";

test("montos y fechas del integrante", () => {
  assert.equal(formatearMonto("20"), "US$20");
  assert.equal(formatearMonto("12.40"), "US$12.40");
  assert.equal(formatearMonto(""), "");
  assert.equal(formatearMonto("   "), "");
  assert.equal(formatearMonto("0"), "US$0");
  assert.equal(formatearFecha("2026-09-27"), "27 sept 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00.000Z"), "27 sept 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00.000z"), "27 sept 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00+0000"), "27 sept 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00-0000"), "27 sept 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00+00:00"), "27 sept 2026");
  assert.equal(formatearFecha("2026-02-29"), "2026-02-29");
  assert.equal(formatearFecha("2026-09-31"), "2026-09-31");
  assert.equal(formatearFecha("2026-02-29T00:00:00.000Z"), "2026-02-29T00:00:00.000Z");
  assert.equal(formatearFecha("2024-02-29"), "29 feb 2024");
  assert.equal(formatearFecha("2026-09-28T02:00:00.000Z"), "27 sept 2026");
  assert.equal(
    montoDeTarea({ tipo: "reembolso", monto: "15", tope: "15" }),
    "Hasta US$15",
  );
  assert.equal(montoDeTarea({ tipo: "reembolso", monto: "", tope: null }), "");
  assert.equal(acortarDireccion("GABCDE1234567890WXYZ"), "GABCDE…WXYZ");
});
