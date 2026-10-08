import assert from "node:assert/strict";
import test from "node:test";
import { acortarDireccion, formatearFecha, formatearHora, formatearMonto, montoAsegurado, montoDeTarea } from "./formato";

test("montos y fechas del integrante", () => {
  assert.equal(formatearMonto("20"), "US$20");
  assert.equal(formatearMonto("12.40"), "US$12.40");
  assert.equal(formatearMonto(""), "");
  assert.equal(formatearMonto("   "), "");
  assert.equal(formatearMonto("0"), "US$0");
  assert.equal(formatearFecha("2026-09-27"), "Sep 27, 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00.000Z"), "Sep 27, 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00.000z"), "Sep 27, 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00+0000"), "Sep 27, 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00-0000"), "Sep 27, 2026");
  assert.equal(formatearFecha("2026-09-27T00:00:00+00:00"), "Sep 27, 2026");
  assert.equal(formatearFecha("2026-02-29"), "2026-02-29");
  assert.equal(formatearFecha("2026-09-31"), "2026-09-31");
  assert.equal(formatearFecha("2026-02-29T00:00:00.000Z"), "2026-02-29T00:00:00.000Z");
  assert.equal(formatearFecha("2024-02-29"), "Feb 29, 2024");
  assert.equal(formatearFecha("2026-09-28T02:00:00.000Z"), "Sep 27, 2026");
  assert.equal(
    montoDeTarea({ tipo: "reembolso", monto: "15", tope: "15" }),
    "Up to US$15",
  );
  assert.equal(montoDeTarea({ tipo: "reembolso", monto: "", tope: null }), "");
  assert.equal(
    montoAsegurado({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" }),
    "US$12.48",
  );
  assert.equal(montoAsegurado({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" }).includes("Up to"), false);
  assert.equal(montoAsegurado({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: null }), "Up to US$15");
  assert.equal(montoAsegurado({ tipo: "trabajo", monto: "20", tope: null }), "US$20");
  assert.equal(acortarDireccion("GABCDE1234567890WXYZ"), "GABCDE…WXYZ");
});

test("una hora se muestra en Costa Rica (UTC-6), no en UTC-7", () => {
  const hora = formatearHora("2026-10-06T16:08:00.000Z", "en");
  assert.match(hora ?? "", /^10:08\sAM$/);
  assert.equal(hora?.startsWith("9:"), false);
  assert.equal(formatearHora("no-es-fecha", "en"), null);
});
