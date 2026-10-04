import assert from "node:assert/strict";
import test from "node:test";
import { normalizarMonto } from "@/lib/admin/vista";
import { armarVeredicto } from "./armar";
import { aplicarReciboSiActivo } from "./recibo-aplicar";
import { reciboClaroActivo } from "./recibo-bandera";
import { decidirRecibo, MARCA_MONEDA_DISTINTA, type RespuestasDecision } from "./recibo-decision";
import { compararFechaPedido, leerFechaRecibo, leerMontoRecibo } from "./recibo-parser";
import { cuerpoRecibo, preguntasRecibo } from "./recibo-preguntas";
import { CLAVES_RECIBO_QWEN, leerExtraccionRecibo, PEDIDO_RECIBO_QWEN } from "./recibo-qwen";
import { leerDescripcion } from "./scout";
import { TOPE_NOTA_REEMBOLSO } from "./pesos";

const SI: RespuestasDecision = {
  comercio: "yes",
  producto: "yes",
  total: "yes",
  fecha: "yes",
  fechaPedido: "yes",
  tipoProducto: "yes",
};

const LITTLE = {
  merchant: "Little Caesars",
  item: "pizza",
  amountRaw: "15.179,99",
  currency: "CRC" as const,
  dateRaw: "02/10/2026",
  dateIso: "2026-10-02",
  pedido: "2 de octubre",
};

test("15.179,99 se lee como 15179.99 CRC y no como dolares", () => {
  const leido = leerMontoRecibo("15.179,99");
  assert.ok(leido);
  assert.equal(leido.centavos, 1_517_999);
  assert.equal(leido.texto, "15179.99");
  assert.equal(leido.cantidad, 15179.99);
  assert.equal(leido.moneda, "CRC");
  assert.notEqual(leido.texto, "15.18");
  assert.notEqual(leido.centavos, 1518);
  assert.notEqual(leido.moneda, "USD");
  assert.equal(normalizarMonto("15.179,99"), null);

  const colon = leerMontoRecibo("₡15.179,99");
  assert.equal(colon?.centavos, 1_517_999);
  assert.equal(colon?.moneda, "CRC");

  const anglo = leerMontoRecibo("15,179.99");
  assert.equal(anglo?.centavos, 1_517_999);
  assert.equal(anglo?.texto, "15179.99");
  assert.equal(anglo?.moneda, null);

  const dolares = leerMontoRecibo("$15,179.99");
  assert.equal(dolares?.centavos, 1_517_999);
  assert.equal(dolares?.moneda, "USD");
});

test("02/10/2026 es el 2 de octubre y no el 10 de febrero", () => {
  assert.equal(leerFechaRecibo("02/10/2026"), "2026-10-02");
  assert.notEqual(leerFechaRecibo("02/10/2026"), "2026-02-10");
  assert.equal(leerFechaRecibo("2026-10-02"), "2026-10-02");
});

test("2 de octubre coincide con 2026-10-02 y no con 2026-10-03", () => {
  assert.equal(compararFechaPedido("2 de octubre", "2026-10-02"), "coincide");
  assert.equal(compararFechaPedido("2 de octubre", "2026-10-03"), "no_coincide");
  assert.equal(compararFechaPedido("October 2", "2026-10-02"), "coincide");
  assert.equal(compararFechaPedido("2 de octubre de 2026", "2026-10-02"), "coincide");
  assert.equal(compararFechaPedido("2 de octubre de 2026", "2025-10-02"), "no_coincide");
  assert.equal(
    compararFechaPedido("Foto de un recibo de pizza válido del día 2 de octubre", "2026-10-02"),
    "coincide",
  );
});

test("unclear no rechaza ni aplica el tope de 40", () => {
  const decision = decidirRecibo({
    respuestas: { ...SI, comercio: "unclear" },
    datos: LITTLE,
    topeUsdc: "15.00",
  });
  assert.equal(decision.resultado, "needs_clarification");
  assert.equal(decision.nota, null);
  assert.notEqual(decision.nota, TOPE_NOTA_REEMBOLSO);
  assert.equal(decision.exceso, false);
  assert.equal(decision.motivos.includes("fecha_distinta"), false);
  assert.equal(decision.motivos.includes("gasto_distinto"), false);

  const sinDatos = decidirRecibo({
    respuestas: { ...SI, total: "unclear", fecha: "unclear", fechaPedido: "unclear" },
    datos: { ...LITTLE, amountRaw: null, currency: null, dateIso: null, dateRaw: null },
    topeUsdc: "15.00",
  });
  assert.equal(sinDatos.resultado, "needs_clarification");
  assert.equal(sinDatos.nota, null);
  assert.notEqual(sinDatos.resultado, "rechazo_duro");
});

test("una fecha presente y distinta es rechazo duro", () => {
  const decision = decidirRecibo({
    respuestas: SI,
    datos: { ...LITTLE, dateIso: "2026-10-03", dateRaw: "03/10/2026" },
    topeUsdc: "15.00",
  });
  assert.equal(decision.resultado, "rechazo_duro");
  assert.deepEqual(decision.motivos, ["fecha_distinta"]);
  assert.equal(decision.nota, null);
  assert.notEqual(decision.nota, 40);
});

test("CRC por encima del tope USDC no es exceso", () => {
  const leido = leerMontoRecibo("15.179,99");
  assert.ok(leido);
  assert.equal(leido.centavos > 15 * 100, true);
  const decision = decidirRecibo({
    respuestas: SI,
    datos: { ...LITTLE, currency: "USD" },
    topeUsdc: "15.00",
  });
  assert.equal(decision.resultado, "ok");
  assert.equal(decision.exceso, false);
  assert.equal(decision.marca, MARCA_MONEDA_DISTINTA);
  assert.equal(decision.topeUsdc, "15.00");
  assert.equal(decision.nota, null);
  assert.equal(decision.motivos.includes("reembolso"), false);
});

test("con la bandera apagada el reembolso existente no cambia", () => {
  assert.equal(reciboClaroActivo({}), false);
  assert.equal(reciboClaroActivo({ HYTO_RECIBO_CLARO: "off" }), false);
  assert.equal(reciboClaroActivo({ HYTO_RECIBO_CLARO: "on" }), true);
  assert.equal(TOPE_NOTA_REEMBOLSO, 40);

  const viejo = armarVeredicto({
    tipo: "reembolso",
    tope: "15.00",
    monto: null,
    fecha: null,
    score: "90",
  });
  assert.ok(viejo);
  assert.equal(viejo.nota, 40);
  assert.equal(viejo.veredicto, "insuficiente");

  const scout = leerDescripcion('{"texto":"Little Caesars pizza","monto":"15.179,99","fecha":"02/10/2026"}');
  assert.equal(scout?.monto, null);
  assert.equal(scout?.fecha, null);

  const apagada = aplicarReciboSiActivo(viejo, { respuestas: { ...SI, comercio: "unclear" }, datos: LITTLE, topeUsdc: "15.00" }, { HYTO_RECIBO_CLARO: "off" });
  assert.equal(apagada.modo, "existente");
  if (apagada.modo !== "existente") return;
  assert.equal(apagada.resultado, viejo);
  assert.equal(apagada.resultado.nota, 40);

  const ausente = aplicarReciboSiActivo(viejo, { respuestas: SI, datos: LITTLE }, {});
  assert.equal(ausente.modo, "existente");
  assert.equal(ausente.resultado.nota, 40);

  const encendida = aplicarReciboSiActivo(viejo, { respuestas: SI, datos: LITTLE, topeUsdc: "15.00" }, { HYTO_RECIBO_CLARO: "on" });
  assert.equal(encendida.modo, "recibo");
  if (encendida.modo !== "recibo") return;
  assert.equal(encendida.resultado, viejo);
  assert.equal(viejo.nota, 40);
  assert.equal(encendida.decision.nota, null);
  assert.equal(encendida.decision.exceso, false);
});

test("la foto que no es recibo y el gasto distinto rechazan; el pedido nuevo no convierte", () => {
  const noRecibo = decidirRecibo({
    respuestas: SI,
    datos: { ...LITTLE, esRecibo: "no" },
  });
  assert.equal(noRecibo.resultado, "rechazo_duro");
  assert.equal(noRecibo.motivos.includes("no_es_recibo"), true);
  assert.equal(noRecibo.nota, null);

  const otroGasto = decidirRecibo({
    respuestas: { ...SI, tipoProducto: "no" },
    datos: LITTLE,
  });
  assert.equal(otroGasto.resultado, "rechazo_duro");
  assert.equal(otroGasto.motivos.includes("gasto_distinto"), true);

  const preguntas = preguntasRecibo("Foto de un recibo de pizza válido del día 2 de octubre");
  for (const pregunta of Object.values(preguntas)) {
    assert.deepEqual(Object.keys(pregunta.criteria).sort(), ["no", "unclear", "yes"]);
  }
  assert.equal(preguntas.total.instructions.includes("15.179,99"), true);
  assert.equal(preguntas.fecha.instructions.includes("02/10/2026"), true);
  assert.equal(preguntas.fechaPedido.instructions.includes("day and the month"), true);
  assert.equal(preguntas.fechaPedido.instructions.includes("{pedido}"), false);
  const cuerpo = cuerpoRecibo("Little Caesars pizza", "2 de octubre") as { model: string; questions: object };
  assert.equal(cuerpo.model, "multilingual");
  assert.equal(Object.keys(cuerpo.questions).length, 6);

  for (const clave of CLAVES_RECIBO_QWEN) assert.equal(PEDIDO_RECIBO_QWEN.includes(clave), true);
  assert.equal(PEDIDO_RECIBO_QWEN.includes("one short sentence"), false);
  assert.equal(PEDIDO_RECIBO_QWEN.includes("in dollars"), false);
  assert.equal(PEDIDO_RECIBO_QWEN.includes("15.179,99"), true);

  const extraido = leerExtraccionRecibo(
    '{"texto":"Little Caesars pizza, total 15.179,99 CRC, on 02/10/2026.","merchant":"Little Caesars","item":"pizza","amount_raw":"15.179,99","currency":"USDC","date_raw":"02/10/2026","date_iso":null}',
  );
  assert.equal(extraido?.amountRaw, "15.179,99");
  assert.equal(extraido?.currency, null);
  assert.equal(extraido?.dateIso, "2026-10-02");
  assert.equal(JSON.stringify(extraido).includes("15.18"), false);
});
