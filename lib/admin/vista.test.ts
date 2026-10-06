import assert from "node:assert/strict";
import test from "node:test";
import { centavos, centavosGasto, detalleMonto, enBandeja, enlaceCredencial, enlacePago, etiquetaOrigen, notaCopia, notaManual, normalizarMonto, resumir, sinVeredicto, textoMonto, vistaAdmin } from "./vista";
import type { MemoriaAdmin } from "./tipos";

const VACIA: MemoriaAdmin = { decisiones: {}, proyecto: null, direccion: null };

test("el origen de la revisión se lee como recomendación, muestra o fallo", () => {
  assert.equal(etiquetaOrigen("scout"), "AI recommendation");
  assert.equal(etiquetaOrigen("stub"), "Sample recommendation");
  assert.equal(etiquetaOrigen("guion"), "Sample recommendation");
  assert.equal(etiquetaOrigen("error"), "Review failed");
  assert.equal(etiquetaOrigen(null), null);
  assert.equal(notaManual("pdf"), "Needs a manual review");
  assert.equal(notaManual("sin_texto"), "Needs a manual review");
  assert.equal(notaManual("sin_clave"), null);
  assert.equal(notaCopia("  Same invoice.  "), "Same invoice.");
  assert.equal(notaCopia("   "), null);
});

test("la bandeja y el contador usan la misma regla", () => {
  const vista = vistaAdmin(VACIA);
  assert.equal(vista.bandeja.length, vista.tareas.filter((tarea) => enBandeja(tarea)).length);
  assert.equal(enBandeja({ estado: "pendiente", veredicto: null }), false);
  assert.equal(enBandeja({ estado: "pendiente", veredicto: "cumplió" }), true);
  assert.equal(enBandeja({ estado: "en revisión", veredicto: null }), true);
  assert.equal(enBandeja({ estado: "pagado", veredicto: "cumplió" }), false);
  assert.equal(enBandeja({ estado: "pagado", veredicto: null }), false);
});

test("the ZEEK example: subtitle, list, and event count all say three", () => {
  const vista = vistaAdmin(VACIA);
  assert.equal(vista.tareas.length, 4);
  assert.equal(vista.bandeja.length, 3);
  assert.equal(vista.tareas.filter((tarea) => enBandeja(tarea)).length, vista.bandeja.length);
  assert.equal(vista.bandeja.some((tarea) => tarea.id === "bienvenida"), false);
});

test("asking for another photo drops the old AI result and leaves the inbox", () => {
  const vista = vistaAdmin({ ...VACIA, decisiones: { registro: "pendiente" } });
  const registro = vista.tareas.find((tarea) => tarea.id === "registro");
  assert.ok(registro);
  assert.equal(registro.estado, "pendiente");
  assert.equal(registro.veredicto, null);
  assert.equal(registro.nota, null);
  assert.equal(registro.frase, null);
  assert.equal(registro.origen, null);
  assert.deepEqual(registro.etiquetas, []);
  assert.equal(vista.bandeja.some((tarea) => tarea.id === "registro"), false);

  const base = vistaAdmin(VACIA).tareas.find((tarea) => tarea.id === "stand");
  assert.ok(base);
  const devuelta = sinVeredicto({ ...base, estado: "pendiente" });
  assert.equal(devuelta.veredicto, null);
  assert.equal(enBandeja(devuelta), false);
});

test("el ejemplo de ZEEK resume presupuesto, bandeja e informe", () => {
  const vista = vistaAdmin(VACIA);
  assert.equal(vista.nombre, "ZEEK");
  assert.equal(vista.ejemplo, true);
  assert.deepEqual(vista.resumen, { presupuesto: "75", pagado: "0", pendiente: "75" });
  assert.deepEqual(
    vista.bandeja.map((tarea) => tarea.id),
    ["stand", "registro", "comida"],
  );
  assert.equal(vista.personas.length, 3);
  assert.equal(vista.personas[0]?.miembro, "Volunteer 1");
  assert.equal(vista.personas[0]?.tareas.length, 2);
  assert.equal(vista.personas[2]?.tareas[0]?.estado, "pendiente");
});

test("aprobar y pedir otra foto cambian el resumen sin inventar un pago", () => {
  const aprobada = vistaAdmin({
    ...VACIA,
    decisiones: { stand: "pagado", comida: "pagado", registro: "pendiente" },
  });
  assert.deepEqual(aprobada.resumen, { presupuesto: "75", pagado: "32.40", pendiente: "42.60" });
  assert.deepEqual(
    aprobada.bandeja.map((tarea) => tarea.id),
    [],
  );
  assert.equal(aprobada.tareas.find((tarea) => tarea.id === "stand")?.hashPago, null);
  assert.equal(enlacePago(aprobada.tareas[0]?.hashPago), null);
});

test("un proyecto propio no entra a la bandeja sin evidencia", () => {
  const vista = vistaAdmin({
    ...VACIA,
    proyecto: {
      nombre: "Ensayo",
      tareas: [{ id: "mesa", titulo: "Mesa", tipo: "trabajo", monto: "10" }],
    },
  });
  assert.equal(vista.propio, true);
  assert.equal(vista.nombre, "Ensayo");
  assert.deepEqual(resumir(vista.tareas), { presupuesto: "10", pagado: "0", pendiente: "10" });
  assert.equal(vista.bandeja.length, 0);
});

test("el reembolso del informe usa el monto revisado y cuadra con lo pagado", () => {
  const vista = vistaAdmin({ ...VACIA, decisiones: { comida: "pagado", stand: "pagado" } });
  const comida = vista.tareas.find((tarea) => tarea.id === "comida");
  const stand = vista.tareas.find((tarea) => tarea.id === "stand");
  assert.ok(comida && stand);
  assert.deepEqual(detalleMonto(comida), { cifra: "12.40", hasta: false, tope: "15" });
  assert.equal(detalleMonto(comida).cifra, textoMonto(centavosGasto(comida)));
  assert.equal(detalleMonto(stand).cifra, textoMonto(centavosGasto(stand)));
  const suma = vista.tareas.reduce((total, tarea) => (tarea.estado === "pagado" ? total + centavos(detalleMonto(tarea).cifra) : total), 0);
  assert.equal(textoMonto(suma), vista.resumen.pagado);
});

test("un reembolso pagado usa el monto confirmado y deja la lectura del recibo", () => {
  const comida = vistaAdmin(VACIA).tareas.find((tarea) => tarea.id === "comida");
  assert.ok(comida);
  const pagada = { ...comida, estado: "pagado" as const, montoConfirmado: "10", montoRevisado: "12.40" };
  assert.equal(centavosGasto(pagada), 1000);
  assert.equal(detalleMonto(pagada).cifra, "10");
  assert.equal(comida.montoRevisado, "12.40");
  assert.equal(comida.montoConfirmado, null);
});

test("los centavos salen del texto y aceptan una coma decimal", () => {
  assert.equal(centavos("19.99"), 1999);
  assert.equal(centavos("12,40"), 1240);
  assert.equal(centavos("10"), 1000);
  assert.equal(centavos("10.5"), 1050);
  assert.equal(centavos("10.555"), 0);
  assert.equal(centavos("1e2"), 0);
  assert.equal(normalizarMonto("12,4"), "12.40");
  assert.equal(normalizarMonto("0"), null);
  assert.equal(normalizarMonto("10.999"), null);

  const vista = vistaAdmin({
    ...VACIA,
    proyecto: {
      nombre: "Ensayo",
      tareas: [{ id: "comida", titulo: "Comida", tipo: "reembolso", monto: "12,40" }],
    },
  });
  assert.equal(vista.resumen.presupuesto, "12.40");
});

test("ver pago y la credencial solo aparecen con un enlace válido", () => {
  const hash = "a".repeat(64);
  assert.equal(enlacePago(hash), `https://stellar.expert/explorer/testnet/tx/${hash}`);
  assert.equal(enlacePago("abc"), null);
  assert.equal(enlacePago("  "), null);
  assert.equal(enlaceCredencial(null), null);
  assert.equal(enlaceCredencial("javascript:alert(1)"), null);
  assert.equal(enlaceCredencial("https://dapp.acta.build/c/1"), "https://dapp.acta.build/c/1");
});
