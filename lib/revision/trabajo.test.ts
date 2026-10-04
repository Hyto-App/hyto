import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizarMonto } from "@/lib/admin/vista";
import { armarVeredicto } from "./armar";
import { preguntasTrabajo } from "./laya-preguntas";
import { TOPE_FALTA_GRAVE, TOPE_NOTA_REEMBOLSO } from "./pesos";
import { leerFechaRecibo } from "./recibo-parser";
import { leerDescripcion } from "./scout";
import { aplicarTrabajoSiActivo } from "./trabajo-aplicar";
import { trabajoClaroActivo } from "./trabajo-bandera";
import { cantidadesExplicitas, decidirTrabajo, type RespuestasDecisionTrabajo } from "./trabajo-decision";
import { leerDineroTrabajo } from "./trabajo-dinero";
import { REGLA_DIA_PRIMERO, REGLA_MES_PRIMERO, REGLA_PEDIDO, REGLA_UNICA, leerFechaTrabajo } from "./trabajo-fechas";
import { cuerpoTrabajo, preguntasTrabajoClaro } from "./trabajo-preguntas";
import { CLAVES_TRABAJO_QWEN, leerExtraccionTrabajo, PEDIDO_TRABAJO_QWEN } from "./trabajo-qwen";

const SI: RespuestasDecisionTrabajo = {
  trabajoVisible: "yes",
  fotoDeTrabajo: "yes",
  esElPedido: "yes",
  lugar: "yes",
  lugarPedido: "yes",
  cantidad: "yes",
  cantidadPedido: "yes",
  progreso: "yes",
  fechaHora: "yes",
  fechaPedido: "yes",
};

const PEDIDO = "Paint 3 benches at the central park on 2 October 2026";

const HECHO = {
  work: "benches painted",
  place: "central park",
  quantityRaw: "3",
  progress: "terminado" as const,
  dateRaw: "2 October 2026",
  dateIso: null,
  pedido: PEDIDO,
};

test("fechas de trabajo en varios formatos, con la ambigua marcada", () => {
  const tabla = [
    {
      valor: "02/10/2026",
      ambigua: true,
      interpretaciones: ["2026-10-02", "2026-02-10"],
      elegida: "2026-10-02",
      regla: REGLA_DIA_PRIMERO,
    },
    {
      valor: "2026/10/02",
      ambigua: false,
      interpretaciones: ["2026-10-02"],
      elegida: "2026-10-02",
      regla: REGLA_UNICA,
    },
    {
      valor: "10/02/2026",
      ambigua: true,
      interpretaciones: ["2026-02-10", "2026-10-02"],
      elegida: "2026-02-10",
      regla: REGLA_DIA_PRIMERO,
    },
    {
      valor: "October 2, 2026",
      ambigua: false,
      interpretaciones: ["2026-10-02"],
      elegida: "2026-10-02",
      regla: REGLA_UNICA,
    },
    {
      valor: "2 de octubre de 2026",
      ambigua: false,
      interpretaciones: ["2026-10-02"],
      elegida: "2026-10-02",
      regla: REGLA_UNICA,
    },
    {
      valor: "2026-10-02",
      ambigua: false,
      interpretaciones: ["2026-10-02"],
      elegida: "2026-10-02",
      regla: REGLA_UNICA,
    },
    {
      valor: "02-10-2026",
      ambigua: true,
      interpretaciones: ["2026-10-02", "2026-02-10"],
      elegida: "2026-10-02",
      regla: REGLA_DIA_PRIMERO,
    },
    {
      valor: "02.10.2026",
      ambigua: true,
      interpretaciones: ["2026-10-02", "2026-02-10"],
      elegida: "2026-10-02",
      regla: REGLA_DIA_PRIMERO,
    },
    {
      valor: "02 10 2026",
      ambigua: true,
      interpretaciones: ["2026-10-02", "2026-02-10"],
      elegida: "2026-10-02",
      regla: REGLA_DIA_PRIMERO,
    },
    {
      valor: "2026 10 02",
      ambigua: false,
      interpretaciones: ["2026-10-02"],
      elegida: "2026-10-02",
      regla: REGLA_UNICA,
    },
    {
      valor: "13/02/2026",
      ambigua: false,
      interpretaciones: ["2026-02-13"],
      elegida: "2026-02-13",
      regla: REGLA_UNICA,
    },
  ];

  for (const fila of tabla) {
    const leida = leerFechaTrabajo(fila.valor);
    assert.equal(leida.ambigua, fila.ambigua, fila.valor);
    assert.equal(leida.marca, fila.ambigua ? "ambigua" : null, fila.valor);
    assert.deepEqual(leida.interpretaciones, fila.interpretaciones, fila.valor);
    assert.equal(leida.elegida, fila.elegida, fila.valor);
    assert.equal(leida.regla, fila.regla, fila.valor);
  }

  const porPedido = leerFechaTrabajo("02/10/2026", { pedido: "10 de febrero de 2026" });
  assert.equal(porPedido.ambigua, true);
  assert.equal(porPedido.marca, "ambigua");
  assert.deepEqual(porPedido.interpretaciones, ["2026-10-02", "2026-02-10"]);
  assert.equal(porPedido.elegida, "2026-02-10");
  assert.equal(porPedido.regla, REGLA_PEDIDO);

  const costaRica = leerFechaTrabajo("02/10/2026", { pedido: "2 de octubre" });
  assert.equal(costaRica.elegida, "2026-10-02");
  assert.equal(costaRica.regla, REGLA_PEDIDO);
  assert.equal(costaRica.ambigua, true);

  const ingles = leerFechaTrabajo("02/10/2026", { locale: "en-US" });
  assert.equal(ingles.elegida, "2026-02-10");
  assert.equal(ingles.regla, REGLA_MES_PRIMERO);
  assert.equal(ingles.ambigua, true);
  assert.deepEqual(ingles.interpretaciones, ["2026-10-02", "2026-02-10"]);

  assert.equal(leerFechaRecibo("02/10/2026"), "2026-10-02");
  assert.equal(leerFechaTrabajo("31/02/2026").elegida, null);
});

test("montos con coma y punto, sin convertir la moneda", () => {
  const tabla = [
    { valor: "15.179,99", texto: "15179.99", moneda: null, ambigua: false },
    { valor: "15,179.99", texto: "15179.99", moneda: null, ambigua: false },
    { valor: "15.179", texto: "15179.00", moneda: null, ambigua: false },
    { valor: "15,18", texto: "15.18", moneda: null, ambigua: false },
    { valor: "₡15.179,99", texto: "15179.99", moneda: "CRC", ambigua: false },
    { valor: "$15.00", texto: "15.00", moneda: "USD", ambigua: false },
  ];

  for (const fila of tabla) {
    const leido = leerDineroTrabajo(fila.valor);
    assert.ok(leido, fila.valor);
    assert.equal(leido.ambigua, fila.ambigua, fila.valor);
    assert.equal(leido.marca, null, fila.valor);
    assert.equal(leido.valor, fila.texto, fila.valor);
    assert.equal(leido.moneda, fila.moneda, fila.valor);
    assert.deepEqual(leido.interpretaciones, [fila.texto], fila.valor);
  }

  assert.equal(leerDineroTrabajo("15.179")?.cantidad, 15179);
  assert.equal(leerDineroTrabajo("15,18")?.valor, "15.18");
  assert.notEqual(leerDineroTrabajo("15.179,99")?.valor, "15.18");
  assert.equal(leerDineroTrabajo("₡15.179,99")?.moneda, "CRC");
  assert.notEqual(leerDineroTrabajo("₡15.179,99")?.moneda, "USD");
  assert.notEqual(leerDineroTrabajo("₡15.179,99")?.moneda, "USDC");

  const ambiguo = leerDineroTrabajo("1,234");
  assert.ok(ambiguo);
  assert.equal(ambiguo.ambigua, true);
  assert.equal(ambiguo.marca, "separador_ambiguo");
  assert.equal(ambiguo.valor, null);
  assert.equal(ambiguo.cantidad, null);
  assert.deepEqual(ambiguo.interpretaciones, ["1234.00", "1.234"]);

  const usdc = leerDineroTrabajo("15.00 USDC");
  assert.equal(usdc?.valor, "15.00");
  assert.equal(usdc?.moneda, "USDC");
  assert.notEqual(usdc?.moneda, "USD");

  const crc = leerDineroTrabajo("15,18 CRC");
  assert.equal(crc?.valor, "15.18");
  assert.equal(crc?.moneda, "CRC");

  assert.equal(normalizarMonto("15.179,99"), null);
  assert.equal(normalizarMonto("15.179"), null);
  assert.equal(normalizarMonto("1,234"), null);
});

test("unclear o un dato ausente no rechaza ni aplica un tope", () => {
  const unclear = decidirTrabajo({
    respuestas: { ...SI, trabajoVisible: "unclear" },
    datos: HECHO,
    tope: "20.00",
  });
  assert.equal(unclear.resultado, "needs_clarification");
  assert.equal(unclear.nota, null);
  assert.notEqual(unclear.nota, TOPE_FALTA_GRAVE);
  assert.notEqual(unclear.nota, TOPE_NOTA_REEMBOLSO);
  assert.equal(unclear.tope, "20.00");
  assert.equal(unclear.motivos.includes("fecha_distinta"), false);
  assert.equal(unclear.motivos.includes("trabajo_distinto"), false);

  const sinFecha = decidirTrabajo({
    respuestas: { ...SI, fechaHora: "unclear", fechaPedido: "unclear" },
    datos: { ...HECHO, dateRaw: null, dateIso: null },
    tope: "20.00",
  });
  assert.equal(sinFecha.resultado, "needs_clarification");
  assert.equal(sinFecha.nota, null);
  assert.notEqual(sinFecha.resultado, "rechazo_duro");

  const parcial = decidirTrabajo({
    respuestas: SI,
    datos: { ...HECHO, progress: "parcial", quantityRaw: "1 of 3" },
  });
  assert.equal(parcial.resultado, "needs_clarification");
  assert.equal(parcial.motivos.includes("cantidad_distinta"), false);
  assert.equal(parcial.motivos.includes("sin_empezar"), false);
  assert.equal(parcial.nota, null);
});

test("un dato presente que contradice el pedido es rechazo duro", () => {
  const otraTarea = decidirTrabajo({
    respuestas: { ...SI, esElPedido: "no" },
    datos: HECHO,
  });
  assert.equal(otraTarea.resultado, "rechazo_duro");
  assert.deepEqual(otraTarea.motivos, ["trabajo_distinto"]);
  assert.equal(otraTarea.nota, null);

  const noEsTrabajo = decidirTrabajo({
    respuestas: { ...SI, fotoDeTrabajo: "no" },
    datos: HECHO,
  });
  assert.equal(noEsTrabajo.resultado, "rechazo_duro");
  assert.equal(noEsTrabajo.motivos.includes("no_es_trabajo"), true);

  const otroLugar = decidirTrabajo({
    respuestas: { ...SI, lugarPedido: "no" },
    datos: { ...HECHO, place: "school courtyard" },
  });
  assert.equal(otroLugar.resultado, "rechazo_duro");
  assert.deepEqual(otroLugar.motivos, ["lugar_distinto"]);

  const otraCantidad = decidirTrabajo({
    respuestas: SI,
    datos: { ...HECHO, quantityRaw: "2" },
  });
  assert.equal(otraCantidad.resultado, "rechazo_duro");
  assert.deepEqual(otraCantidad.motivos, ["cantidad_distinta"]);

  const otraFecha = decidirTrabajo({
    respuestas: SI,
    datos: {
      ...HECHO,
      pedido: "Paint 3 benches at the central park on 3 October 2026",
      dateRaw: "02/10/2026",
    },
  });
  assert.equal(otraFecha.resultado, "rechazo_duro");
  assert.deepEqual(otraFecha.motivos, ["fecha_distinta"]);
  assert.equal(otraFecha.nota, null);
  assert.notEqual(otraFecha.nota, 49);

  const sinEmpezar = decidirTrabajo({
    respuestas: SI,
    datos: { ...HECHO, progress: "sin_empezar" },
  });
  assert.equal(sinEmpezar.resultado, "rechazo_duro");
  assert.equal(sinEmpezar.motivos.includes("sin_empezar"), true);

  const pedidoVacio = decidirTrabajo({
    respuestas: { ...SI, esElPedido: "no" },
    datos: { ...HECHO, work: null },
  });
  assert.equal(pedidoVacio.resultado, "needs_clarification");
  assert.notEqual(pedidoVacio.resultado, "rechazo_duro");

  const fechaAbierta = decidirTrabajo({
    respuestas: { ...SI, fechaHora: "unclear", fechaPedido: "unclear" },
    datos: { ...HECHO, dateRaw: "02/10/2026", pedido: "Paint 3 benches at the central park" },
  });
  assert.equal(fechaAbierta.resultado, "needs_clarification");
  assert.equal(fechaAbierta.motivos.includes("fecha_distinta"), false);

  const resuelto = decidirTrabajo({ respuestas: SI, datos: { ...HECHO, dateRaw: "02/10/2026" } });
  assert.equal(resuelto.resultado, "ok");
  assert.equal(resuelto.nota, null);
  assert.deepEqual(resuelto.motivos, []);
  assert.deepEqual(cantidadesExplicitas(PEDIDO), [3]);
});

test("con la bandera apagada el trabajo existente no cambia", () => {
  assert.equal(trabajoClaroActivo({}), false);
  assert.equal(trabajoClaroActivo({ HYTO_TRABAJO_CLARO: "off" }), false);
  assert.equal(trabajoClaroActivo({ HYTO_TRABAJO_CLARO: "" }), false);
  assert.equal(trabajoClaroActivo({ HYTO_TRABAJO_CLARO: "on" }), true);
  assert.equal(TOPE_FALTA_GRAVE, 49);
  assert.equal(TOPE_NOTA_REEMBOLSO, 40);

  const viejo = armarVeredicto({
    tipo: "trabajo",
    tope: null,
    monto: null,
    fecha: null,
    score: "90",
    motivos: ["no_coincide"],
  });
  assert.ok(viejo);
  assert.equal(viejo.nota, 49);
  assert.equal(viejo.veredicto, "insuficiente");

  const claro = armarVeredicto({ tipo: "trabajo", tope: null, monto: null, fecha: null, score: "90" });
  assert.equal(claro?.nota, 90);
  assert.equal(claro?.veredicto, "cumplió");

  const scout = leerDescripcion('{"texto":"Three benches painted","monto":"15.179,99","fecha":"02/10/2026"}');
  assert.equal(scout?.texto, "Three benches painted");
  assert.equal(scout?.monto, null);
  assert.equal(scout?.fecha, null);

  assert.equal(Object.keys(preguntasTrabajo(PEDIDO)).length, 11);
  assert.equal(preguntasTrabajo(PEDIDO).v3.type, "noul");
  assert.equal(preguntasTrabajo(PEDIDO).t8.instructions.includes("{pedido}"), false);

  const apagada = aplicarTrabajoSiActivo(viejo, { respuestas: { ...SI, trabajoVisible: "unclear" }, datos: HECHO, tope: "20.00" }, { HYTO_TRABAJO_CLARO: "off" });
  assert.equal(apagada.modo, "existente");
  if (apagada.modo !== "existente") return;
  assert.equal(apagada.resultado, viejo);
  assert.equal(apagada.resultado.nota, 49);

  const ausente = aplicarTrabajoSiActivo(viejo, { respuestas: SI, datos: HECHO }, {});
  assert.equal(ausente.modo, "existente");
  assert.equal(ausente.resultado.nota, 49);

  const encendida = aplicarTrabajoSiActivo(viejo, { respuestas: SI, datos: HECHO, tope: "20.00" }, { HYTO_TRABAJO_CLARO: "on" });
  assert.equal(encendida.modo, "trabajo");
  if (encendida.modo !== "trabajo") return;
  assert.equal(encendida.resultado, viejo);
  assert.equal(viejo.nota, 49);
  assert.equal(encendida.decision.nota, null);
  assert.equal(encendida.decision.resultado, "ok");
});

test("las preguntas nuevas son yes no unclear y el pedido de Qwen no resume", () => {
  const preguntas = preguntasTrabajoClaro(PEDIDO);
  assert.equal(Object.keys(preguntas).length, 10);
  for (const pregunta of Object.values(preguntas)) {
    assert.equal(pregunta.type, "choice");
    assert.deepEqual(Object.keys(pregunta.criteria).sort(), ["no", "unclear", "yes"]);
  }
  assert.equal(preguntas.esElPedido.instructions.includes(PEDIDO), true);
  assert.equal(preguntas.esElPedido.instructions.includes("{pedido}"), false);
  assert.equal(preguntas.lugarPedido.instructions.includes("unclear"), true);
  assert.equal(preguntas.fechaHora.instructions.includes("02/10/2026"), true);
  assert.equal(preguntas.cantidadPedido.instructions.includes("unclear"), true);
  const cuerpo = cuerpoTrabajo("Three benches painted at the central park.", PEDIDO) as { model: string; questions: object };
  assert.equal(cuerpo.model, "multilingual");
  assert.equal(Object.keys(cuerpo.questions).length, 10);

  for (const clave of CLAVES_TRABAJO_QWEN) assert.equal(PEDIDO_TRABAJO_QWEN.includes(clave), true);
  assert.equal(PEDIDO_TRABAJO_QWEN.includes("one short sentence"), true);
  assert.equal(PEDIDO_TRABAJO_QWEN.includes("Do not compress"), true);
  assert.equal(PEDIDO_TRABAJO_QWEN.includes("in dollars"), false);
  assert.equal(PEDIDO_TRABAJO_QWEN.includes("15.179,99"), true);

  const extraido = leerExtraccionTrabajo(
    '{"texto":"Three green benches at the central park.","work":"benches painted","place":"central park","quantity_raw":"3","progress":"finished","date_raw":"02/10/2026","time_raw":null,"amount_raw":"15.179,99","currency":"CRC","date_iso":"2026-02-10"}',
  );
  assert.equal(extraido?.work, "benches painted");
  assert.equal(extraido?.progress, "terminado");
  assert.equal(extraido?.amountRaw, "15.179,99");
  assert.equal(extraido?.currency, "CRC");
  assert.equal(extraido?.dateRaw, "02/10/2026");
  assert.equal(extraido?.dateIso, null);
  assert.equal(JSON.stringify(extraido).includes("15.18"), false);

  const guion = readFileSync("scripts/trabajo-preguntas-laya.ts", "utf8");
  assert.equal(guion.includes("LAYA_API_KEY"), true);
  assert.equal(guion.includes("console.log(process.env.LAYA_API_KEY"), false);
  assert.equal(guion.includes("console.log(clave"), false);
  assert.equal(guion.includes("completo"), true);
  assert.equal(guion.includes("parcial"), true);
  assert.equal(guion.includes("otro_lugar"), true);
  assert.equal(guion.includes("vago"), true);
});
