import assert from "node:assert/strict";
import test from "node:test";
import { acortarDireccion, explicarNeto, explicarPago, formatearCentavos, formatearColones, formatearFecha, formatearHora, formatearMonto, formatearRecibido, lineaMontoTarea, montoAsegurado, montoDeTarea, montoQueAparta, montosDeCobro, textosSaldo, totalGanado, vistaMonto } from "./formato";
import { armarOrgullo } from "./orgullo";

test("montos y fechas del integrante", () => {
  assert.equal(formatearMonto("20"), "US$20.00");
  assert.equal(formatearMonto("12.40"), "US$12.40");
  assert.equal(formatearMonto(""), "");
  assert.equal(formatearMonto("   "), "");
  assert.equal(formatearMonto("0"), "US$0.00");
  assert.equal(formatearCentavos("6"), "US$6.00");
  assert.equal(formatearCentavos("40.60", "es"), "US$40,60");
  assert.equal(formatearCentavos("1", "es"), "US$1,00");
  assert.deepEqual(textosSaldo({ necesario: "40.60", reserva: "1.00", falta: "39.30" }, "es"), {
    n: "US$40,60",
    reserva: "US$1,00",
    falta: "US$39,30",
  });
  assert.equal(formatearRecibido("0"), "US$0.00");
  assert.equal(formatearRecibido("18.5"), "US$18.50");
  assert.equal(formatearRecibido("1.994"), "US$1.99");
  assert.equal(formatearRecibido("12.44256"), "US$12.44");
  assert.equal(formatearRecibido("14.43656"), "US$14.43");
  assert.equal(formatearRecibido("1.994", "es"), "US$1,99");
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
    "Up to US$15.00",
  );
  assert.equal(montoDeTarea({ tipo: "reembolso", monto: "", tope: null }), "");
  assert.equal(
    montoAsegurado({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" }),
    "US$12.48",
  );
  assert.equal(montoAsegurado({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" }).includes("Up to"), false);
  assert.equal(montoAsegurado({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: null }), "Up to US$15.00");
  assert.equal(montoAsegurado({ tipo: "trabajo", monto: "20", tope: null }), "US$20.00");
  const limite = (monto: string) => `Limit ${monto}`;
  assert.equal(
    lineaMontoTarea(
      { estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48", montoRevisado: "12.48" },
      "en",
      limite,
    ),
    "US$12.44 (US$12.48 minus a US$0.04 fee) · Limit US$15.00",
  );
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" }, "en", limite).includes("Up to"),
    false,
  );
  assert.equal(
    lineaMontoTarea({ estado: "en revisión", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" }, "en", limite),
    "Amount to pay US$12.48 · Limit US$15.00",
  );
  assert.equal(
    lineaMontoTarea({ estado: "en revisión", tipo: "reembolso", monto: "50", tope: "50", montoConfirmado: "39.60" }, "es", (monto) => `Límite ${monto}`),
    "Monto a pagar US$39,60 · Límite US$50,00",
  );
  assert.equal(
    vistaMonto({ tipo: "reembolso", monto: "50", tope: "50", montoConfirmado: "39.60" }).linea,
    "Amount to pay US$39.60 · Limit US$50.00",
  );
  assert.equal(vistaMonto({ tipo: "reembolso", monto: "50", tope: "50" }).linea, "Up to US$50.00");
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "trabajo", monto: "20", tope: null }, "en", limite),
    "US$19.94 (US$20.00 minus a US$0.06 fee) · Limit US$20.00",
  );
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "trabajo", monto: "2", tope: null }, "en", limite),
    "US$1.99 (US$2.00 minus a US$0.01 fee) · Limit US$2.00",
  );
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "15" }, "en", limite),
    "US$14.96 (US$15.00 minus a US$0.04 fee) · Limit US$15.00",
  );
  assert.equal(
    lineaMontoTarea(
      { estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" },
      "es",
      (monto) => `Límite ${monto}`,
    ),
    "US$12,44 (US$12,48 menos comisión de US$0,04) · Límite US$15,00",
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
  assert.equal(montoQueAparta({ tipo: "trabajo", monto: "20", tope: null }), "US$20.00");
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

test("enteros, centavos y saldos de 7 decimales en español y en inglés", () => {
  assert.equal(formatearMonto("2"), "US$2.00");
  assert.equal(formatearMonto("2", "es"), "US$2,00");
  assert.equal(formatearMonto("50"), "US$50.00");
  assert.equal(formatearMonto("50", "es"), "US$50,00");
  assert.equal(formatearMonto("12.40"), "US$12.40");
  assert.equal(formatearMonto("12.4", "es"), "US$12,40");
  assert.equal(formatearMonto("0", "es"), "US$0,00");
  assert.equal(formatearMonto("1234.5", "es"), "US$1.234,50");
  assert.equal(formatearMonto("1234.5"), "US$1,234.50");
  assert.equal(formatearCentavos("6"), "US$6.00");

  assert.equal(formatearRecibido("16.43056", "es"), "US$16,43");
  assert.equal(formatearRecibido("16.43056"), "US$16.43");
  assert.equal(formatearRecibido("14.43656"), "US$14.43");
  assert.equal(formatearRecibido("14.43656", "es"), "US$14,43");
  assert.equal(formatearRecibido("12.44256"), "US$12.44");
  assert.equal(formatearRecibido("1.994", "es"), "US$1,99");
  assert.equal(formatearRecibido("12.999"), "US$12.99");
  assert.equal(formatearRecibido("1000.009", "es"), "US$1.000,00");
  assert.equal(formatearRecibido("0", "es"), "US$0,00");
  assert.equal(formatearRecibido("18.5", "es"), "US$18,50");

  assert.equal(formatearColones(505, "es"), "₡505");
  assert.equal(formatearColones(505), "₡505");
  assert.equal(formatearColones(1500.5, "es"), "₡1.500,50");
  assert.equal(formatearColones(1500.5), "₡1,500.50");

  assert.equal(
    vistaMonto({ tipo: "reembolso", monto: "50", tope: "50", montoConfirmado: "39.60" }, "es").linea,
    "Monto a pagar US$39,60 · Límite US$50,00",
  );
  assert.equal(
    vistaMonto({ tipo: "reembolso", monto: "50", tope: "50", montoConfirmado: "39.60" }).linea,
    "Amount to pay US$39.60 · Limit US$50.00",
  );
});

test("la línea de un reembolso confirmado se parte solo entre el monto a pagar y el límite", () => {
  const confirmado = { tipo: "reembolso" as const, monto: "50", tope: "50", montoConfirmado: "39.60" };
  assert.deepEqual(vistaMonto(confirmado, "es").partes, ["Monto a pagar US$39,60", "Límite US$50,00"]);
  assert.equal(vistaMonto(confirmado, "es").linea, "Monto a pagar US$39,60 · Límite US$50,00");
  assert.deepEqual(vistaMonto(confirmado).partes, ["Amount to pay US$39.60", "Limit US$50.00"]);
  assert.deepEqual(vistaMonto({ tipo: "reembolso", monto: "50", tope: "50" }, "es").partes, ["Hasta US$50,00"]);
  assert.deepEqual(vistaMonto({ tipo: "trabajo", monto: "20", tope: null }).partes, ["US$20.00"]);
});

test("lo ganado suma el neto al centavo de cada tarea pagada, como la cuenta", () => {
  const tareas = [
    { estado: "pagado", tipo: "reembolso" as const, monto: "15", tope: "15", montoConfirmado: "12.48", montoPagado: "12.44256" },
    { estado: "pagado", tipo: "trabajo" as const, monto: "2", tope: null, montoPagado: "1.994" },
    { estado: "pagado", tipo: "trabajo" as const, monto: "2", tope: null, montoPagado: "1.994" },
    { estado: "en revisión", tipo: "trabajo" as const, monto: "20", tope: null },
  ];
  assert.equal(totalGanado(tareas), "US$16.42");
  assert.equal(totalGanado(tareas, "es"), "US$16,42");
  assert.deepEqual(
    tareas.filter((tarea) => tarea.estado === "pagado").map((tarea) => explicarPago(tarea)?.corto),
    ["US$12.44", "US$1.99", "US$1.99"],
  );
  const cuenta = armarOrgullo(
    ["12.44256", "1.994", "1.994"].map((monto, indice) => ({
      id: `pagada-${indice}`,
      titulo: "Tarea",
      proyectoId: "evento",
      proyecto: "Evento",
      pagada: true,
      monto,
      pagadoEn: null,
    })),
  );
  assert.equal(formatearMonto(cuenta.total, "es"), totalGanado(tareas, "es"));
  assert.equal(totalGanado([]), "US$0.00");
  assert.equal(totalGanado([{ estado: "pagado", tipo: "reembolso", monto: "15", tope: "15" }], "es"), "US$0,00");
});

test("el neto pagado dice el bruto y la comisión redondeada", () => {
  assert.equal(explicarNeto("12.44256"), "US$12.44 (US$12.48 minus a US$0.04 fee)");
  assert.equal(explicarNeto("1.994", "es"), "US$1,99 (US$2,00 menos comisión de US$0,01)");
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
