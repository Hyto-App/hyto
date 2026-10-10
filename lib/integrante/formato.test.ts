import assert from "node:assert/strict";
import test from "node:test";
import { acortarDireccion, detalleMontoTarea, explicarNeto, explicarPago, formatearCentavos, formatearFecha, formatearHora, formatearMonto, formatearRecibido, lineaMontoTarea, montoAsegurado, montoDeTarea, montoDelBloqueo, montoQueAparta, montosDeCobro, netoDePago, textosSaldo, totalGanado, vistaMonto } from "./formato";

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
  assert.equal(formatearRecibido("14.43656"), "US$14.44");
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
    "US$12.44 · Limit US$15.00",
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
    "US$19.94 · Limit US$20.00",
  );
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "trabajo", monto: "2", tope: null }, "en", limite),
    "US$1.99 · Limit US$2.00",
  );
  assert.equal(
    lineaMontoTarea({ estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "15" }, "en", limite),
    "US$14.96 · Limit US$15.00",
  );
  assert.equal(
    lineaMontoTarea(
      { estado: "pagado", tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" },
      "es",
      (monto) => `Límite ${monto}`,
    ),
    "US$12,44 · Límite US$15,00",
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

test("un solo formato de monto: US$x,xx en español y US$x.xx en inglés, siempre con dos decimales", () => {
  const casos: [string, string, string][] = [
    ["20", "US$20.00", "US$20,00"],
    ["26.45", "US$26.45", "US$26,45"],
    ["6.5", "US$6.50", "US$6,50"],
    ["0.02", "US$0.02", "US$0,02"],
    ["1.994", "US$1.99", "US$1,99"],
  ];
  for (const [crudo, ingles, espanol] of casos) {
    assert.equal(formatearMonto(crudo, "en"), ingles, crudo);
    assert.equal(formatearMonto(crudo, "es"), espanol, crudo);
    assert.equal(formatearRecibido(crudo, "en"), ingles, crudo);
    assert.equal(formatearRecibido(crudo, "es"), espanol, crudo);
    assert.equal(formatearCentavos(crudo, "es"), espanol, crudo);
  }
  for (const idioma of ["en", "es"] as const) {
    for (const valor of ["1", "15", "0.1", "12.4", "1234.5"]) {
      assert.match(formatearMonto(valor, idioma), idioma === "es" ? /^US\$[\d\s.\u00a0]+,\d{2}$/ : /^US\$[\d,]+\.\d{2}$/, valor);
    }
  }
  assert.equal(montoDeTarea({ tipo: "reembolso", monto: "15", tope: "15" }, "es"), "Hasta US$15,00");
});

test("bandeja y tarjeta muestran el mismo neto, y el bruto con la comisión es solo un detalle", () => {
  const pagadas = [
    { estado: "pagado", tipo: "trabajo" as const, monto: "6.53", tope: null },
    { estado: "pagado", tipo: "trabajo" as const, monto: "20", tope: null },
    { estado: "pagado", tipo: "reembolso" as const, monto: "15", tope: "15", montoConfirmado: "12.48" },
    { estado: "pendiente", tipo: "trabajo" as const, monto: "20", tope: null },
  ];
  for (const idioma of ["en", "es"] as const) {
    for (const tarea of pagadas.filter((fila) => fila.estado === "pagado")) {
      const tarjeta = explicarPago(tarea, idioma)?.corto;
      assert.ok(tarjeta);
      // The inbox row starts with the same net the person's task card shows.
      assert.equal(lineaMontoTarea(tarea, idioma).split(" · ")[0], tarjeta);
      assert.equal(lineaMontoTarea(tarea, idioma, (monto) => monto).startsWith(`${tarjeta} · `), true);
      assert.equal(detalleMontoTarea(tarea, idioma), explicarPago(tarea, idioma)?.detalle);
    }
  }
  assert.equal(explicarPago(pagadas[0], "es")?.corto, "US$6,51");
  assert.equal(explicarPago(pagadas[0], "es")?.detalle, "US$6,53 menos comisión de US$0,02");
  assert.equal(explicarPago(pagadas[0], "en")?.detalle, "US$6.53 minus a US$0.02 fee");
  assert.equal(detalleMontoTarea(pagadas[3], "es"), null);
  // "Earned" adds up the net of each card: 6.51 + 19.94 + 12.44.
  const suma = pagadas.reduce((total, tarea) => total + (tarea.estado === "pagado" ? Number(netoDePago(tarea)) : 0), 0);
  assert.equal(suma.toFixed(2), "38.89");
  assert.equal(totalGanado(pagadas, "es"), "US$38,89");
  assert.equal(totalGanado(pagadas, "en"), "US$38.89");
  assert.equal(totalGanado([], "es"), "US$0,00");
});

test("el diálogo de bloqueo siempre muestra el monto, y en un reembolso sin confirmar dice hasta el tope", () => {
  assert.deepEqual(montoDelBloqueo({ tipo: "trabajo", monto: "20", tope: null }, "es"), {
    visible: "US$20,00",
    accion: "US$20,00",
    hasta: false,
  });
  assert.deepEqual(montoDelBloqueo({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: null }, "es"), {
    visible: "Hasta US$15,00",
    accion: "hasta US$15,00",
    hasta: true,
  });
  assert.deepEqual(montoDelBloqueo({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: null }, "en"), {
    visible: "Up to US$15.00",
    accion: "up to US$15.00",
    hasta: true,
  });
  assert.deepEqual(montoDelBloqueo({ tipo: "reembolso", monto: "15", tope: "15", montoConfirmado: "12.48" }, "es"), {
    visible: "US$12,48",
    accion: "US$12,48",
    hasta: false,
  });
});
