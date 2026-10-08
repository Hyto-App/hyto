import assert from "node:assert/strict";
import test from "node:test";
import { acortarDireccion, explicarNeto, explicarPago, formatearCentavos, formatearFecha, formatearHora, formatearMonto, formatearRecibido, lineaMontoTarea, montoAsegurado, montoDeTarea, montoQueAparta, montosDeCobro, textosSaldo, vistaMonto } from "./formato";

test("montos y fechas del integrante", () => {
  assert.equal(formatearMonto("20"), "US$20");
  assert.equal(formatearMonto("12.40"), "US$12.40");
  assert.equal(formatearMonto(""), "");
  assert.equal(formatearMonto("   "), "");
  assert.equal(formatearMonto("0"), "US$0");
  assert.equal(formatearCentavos("6"), "US$6.00");
  assert.equal(formatearCentavos("40.60", "es"), "US$40,60");
  assert.equal(formatearCentavos("1", "es"), "US$1,00");
  assert.deepEqual(textosSaldo({ necesario: "40.60", reserva: "1.00", falta: "39.30" }, "es"), {
    n: "US$40,60",
    reserva: "US$1,00",
    falta: "US$39,30",
  });
  assert.equal(formatearRecibido("0"), "US$0");
  assert.equal(formatearRecibido("18.5"), "US$18.50");
  assert.equal(formatearRecibido("1.994"), "US$1.994");
  assert.equal(formatearRecibido("12.44256"), "US$12.44256");
  assert.equal(formatearRecibido("14.43656"), "US$14.43656");
  assert.equal(formatearRecibido("1.994", "es"), "US$1,994");
  assert.equal(formatearRecibido("12.48", "es"), "US$12,48");
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
  const limite = (monto: string) => `Limit ${monto}`;
  assert.equal(
    lineaMontoTarea(
      { estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48", montoRevisado: "12.48" },
      "en",
      limite,
    ),
    "US$12.44 (US$12.48 minus a US$0.04 fee) · Limit US$15",
  );
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" }, "en", limite).includes("Up to"),
    false,
  );
  assert.equal(
    lineaMontoTarea({ estado: "en revisión", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" }, "en", limite),
    "Amount to pay US$12.48 · Limit US$15",
  );
  assert.equal(
    lineaMontoTarea({ estado: "en revisión", tipo: "reembolso", monto: "50", tope: "50", montoConfirmado: "39.60" }, "es", (monto) => `Límite ${monto}`),
    "Monto a pagar US$39,60 · Límite US$50",
  );
  assert.equal(
    vistaMonto({ tipo: "reembolso", monto: "50", tope: "50", montoConfirmado: "39.60" }).linea,
    "Amount to pay US$39.60 · Limit US$50",
  );
  assert.equal(vistaMonto({ tipo: "reembolso", monto: "50", tope: "50" }).linea, "Up to US$50");
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "trabajo", monto: "20", tope: null }, "en", limite),
    "US$19.94 (US$20 minus a US$0.06 fee) · Limit US$20",
  );
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "trabajo", monto: "2", tope: null }, "en", limite),
    "US$1.99 (US$2 minus a US$0.01 fee) · Limit US$2",
  );
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "15" }, "en", limite),
    "US$14.96 (US$15 minus a US$0.04 fee) · Limit US$15",
  );
  assert.equal(
    lineaMontoTarea(
      { estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" },
      "es",
      (monto) => `Límite ${monto}`,
    ),
    "US$12,44 (US$12,48 menos comisión de US$0,04) · Límite US$15",
  );
  assert.equal(acortarDireccion("GABCDE1234567890WXYZ"), "GABCDE…WXYZ");
  assert.equal(
    montoQueAparta({ tipo: "reembolso", monto: "0.25", tope: "0.25", montoConfirmado: "0.22" }),
    "US$0.22",
  );
  assert.equal(montoQueAparta({ tipo: "reembolso", monto: "0.25", tope: "0.25", montoConfirmado: "0.22" }).includes("Up to"), false);
  assert.equal(montoQueAparta({ tipo: "reembolso", monto: "0.25", tope: "0.25", montoConfirmado: "0.22" }, "es"), "US$0,22");
  assert.equal(montoQueAparta({ tipo: "reembolso", monto: "0.25", tope: "0.25" }, "es"), "hasta US$0,25");
  assert.equal(montoQueAparta({ tipo: "reembolso", monto: "0.25", tope: "0.25" }), "up to US$0.25");
  assert.equal(montoQueAparta({ tipo: "trabajo", monto: "20", tope: null }), "US$20");
  assert.deepEqual(
    montosDeCobro({ tipo: "reembolso", monto: "0.25", tope: "0.25", montoRevisado: "0.30", montoConfirmado: null }),
    { leido: "US$0.30", pago: "US$0.25" },
  );
  assert.deepEqual(
    montosDeCobro({ tipo: "reembolso", monto: "15", tope: "15", montoRevisado: "12.48", montoConfirmado: "12.48" }, "es"),
    { leido: "US$12,48", pago: "US$12,48" },
  );
  assert.equal(montosDeCobro({ tipo: "trabajo", monto: "20", tope: null, montoRevisado: null }), null);
});

test("la línea de un reembolso confirmado se parte solo entre el monto a pagar y el límite", () => {
  const confirmado = { tipo: "reembolso" as const, monto: "50", tope: "50", montoConfirmado: "39.60" };
  assert.deepEqual(vistaMonto(confirmado, "es").partes, ["Monto a pagar US$39,60", "Límite US$50"]);
  assert.equal(vistaMonto(confirmado, "es").linea, "Monto a pagar US$39,60 · Límite US$50");
  assert.deepEqual(vistaMonto(confirmado).partes, ["Amount to pay US$39.60", "Limit US$50"]);
  assert.deepEqual(vistaMonto({ tipo: "reembolso", monto: "50", tope: "50" }, "es").partes, ["Hasta US$50"]);
  assert.deepEqual(vistaMonto({ tipo: "trabajo", monto: "20", tope: null }).partes, ["US$20"]);
});

test("el neto pagado dice el bruto y la comisión redondeada", () => {
  assert.equal(explicarNeto("12.44256"), "US$12.44 (US$12.48 minus a US$0.04 fee)");
  assert.equal(explicarNeto("1.994", "es"), "US$1,99 (US$2 menos comisión de US$0,01)");
  assert.equal(
    explicarPago({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" })?.frase,
    "US$12.44 (US$12.48 minus a US$0.04 fee)",
  );
});

test("una hora se muestra en Costa Rica (UTC-6), no en UTC-7", () => {
  const hora = formatearHora("2026-10-06T16:08:00.000Z", "en");
  assert.match(hora ?? "", /^10:08\sAM$/);
  assert.equal(hora?.startsWith("9:"), false);
  assert.equal(formatearHora("no-es-fecha", "en"), null);
});
