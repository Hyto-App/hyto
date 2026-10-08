import assert from "node:assert/strict";
import test from "node:test";
import { cerrar } from "./armar";
import { leerTrabajo, preguntarLaya, senalesDeTrabajo, type RespuestasTrabajo } from "./laya";
import { preguntasFactura, preguntasTrabajo } from "./laya-preguntas";
import { TOPE_FALTA_GRAVE, calificar, notaDeTrabajo } from "./pesos";
import { preguntasEventoActivas } from "./preguntas-evento-bandera";
import { etiquetasDe } from "./razones";
import { escribirSnapshot, leerSnapshot } from "./snapshot-razones";

const PEDIDO = "Photo of the group with the banners";
const ENV = "HYTO_MILE_PREGUNTAS_EVENTO";

test("el interruptor solo se enciende con on", () => {
  assert.equal(preguntasEventoActivas({}), false);
  assert.equal(preguntasEventoActivas({ HYTO_MILE_PREGUNTAS_EVENTO: "" }), false);
  assert.equal(preguntasEventoActivas({ HYTO_MILE_PREGUNTAS_EVENTO: "off" }), false);
  assert.equal(preguntasEventoActivas({ HYTO_MILE_PREGUNTAS_EVENTO: "true" }), false);
  assert.equal(preguntasEventoActivas({ HYTO_MILE_PREGUNTAS_EVENTO: "1" }), false);
  assert.equal(preguntasEventoActivas({ HYTO_MILE_PREGUNTAS_EVENTO: "yes" }), false);
  assert.equal(preguntasEventoActivas({ HYTO_MILE_PREGUNTAS_EVENTO: "ON" }), true);
  assert.equal(preguntasEventoActivas({ HYTO_MILE_PREGUNTAS_EVENTO: " on " }), true);
  assert.equal(preguntasEventoActivas({ HYTO_MILE_PREGUNTAS_EVENTO: "on" }), true);
});

test("apagado, las preguntas de trabajo son las de siempre", () => {
  const preguntas = preguntasTrabajo(PEDIDO, preguntasEventoActivas({}));
  assert.equal("documentar_evento" in preguntas.t5.criteria, false);
  assert.equal("no_aplica" in preguntas.t6.criteria, false);
  assert.deepEqual(Object.keys(preguntas.t5.criteria), [
    "pintar",
    "limpiar",
    "armar_o_montar",
    "vender_o_atender",
    "transportar",
    "otra_o_no_claro",
  ]);
  assert.deepEqual(Object.keys(preguntas.t6.criteria), ["terminado", "a_medias", "sin_empezar", "no_claro"]);
  assert.equal(preguntas.t5.criteria.pintar, "Something was painted or drawn.");
  assert.equal(
    preguntas.t5.instructions,
    "What was done, according to the written description? Pick one label. Use only what the description states.",
  );
  assert.equal(
    preguntas.t6.instructions,
    "In what condition is the finished work, according to the written description? Pick one label. Use only what the description states.",
  );
  assert.equal(preguntas.t6.criteria.sin_empezar, "The description shows no work done, such as an empty wall or an empty room.");
  assert.deepEqual(preguntasTrabajo(PEDIDO), preguntas);
  assert.deepEqual(Object.keys(preguntasFactura(PEDIDO)), ["f1", "f2", "f3", "f4", "g1", "g2", "g3", "g4", "g5"]);
});

test("encendido, t5 documenta el evento y t6 puede no aplicar", () => {
  const apagado = preguntasTrabajo(PEDIDO, false);
  const encendido = preguntasTrabajo(PEDIDO, preguntasEventoActivas({ HYTO_MILE_PREGUNTAS_EVENTO: "on" }));
  assert.deepEqual(Object.keys(encendido), Object.keys(apagado));
  assert.deepEqual(encendido.lugar, apagado.lugar);
  assert.deepEqual(encendido.v1, apagado.v1);
  assert.deepEqual(encendido.v2, apagado.v2);
  assert.deepEqual(encendido.v3, apagado.v3);
  assert.deepEqual(encendido.v4, apagado.v4);
  assert.deepEqual(encendido.t7, apagado.t7);
  assert.deepEqual(encendido.t8, apagado.t8);
  assert.deepEqual(encendido.t9, apagado.t9);
  assert.deepEqual(encendido.t10, apagado.t10);
  assert.deepEqual(Object.keys(encendido.t5.criteria), [
    "pintar",
    "limpiar",
    "armar_o_montar",
    "vender_o_atender",
    "transportar",
    "documentar_evento",
    "otra_o_no_claro",
  ]);
  assert.match(encendido.t5.criteria.documentar_evento ?? "", /Documenting an event/);
  assert.match(encendido.t5.criteria.pintar ?? "", /not painting/);
  assert.match(encendido.t5.instructions, /not painting/);
  assert.deepEqual(Object.keys(encendido.t6.criteria), ["terminado", "a_medias", "sin_empezar", "no_aplica", "no_claro"]);
  assert.match(encendido.t6.criteria.no_aplica ?? "", /Does not apply: it is a scene or an event/);
  assert.match(encendido.t6.instructions, /pick no_aplica/);
  assert.equal(encendido.t6.criteria.sin_empezar, apagado.t6.criteria.sin_empezar);
});

test("no aplica no usa el tope de sin empezar, y una tarea sin empezar sí", () => {
  const escena = cerrado({ ...trabajo(), t5: "documentar_evento", t6: "no_aplica" });
  const sinEmpezar = cerrado({ ...trabajo(), t6: "sin_empezar" });
  assert.equal(escena?.nota, 100);
  assert.equal(escena?.veredicto, "cumplió");
  assert.equal(escena?.motivos, undefined);
  assert.notEqual(escena?.nota, TOPE_FALTA_GRAVE);
  assert.equal(sinEmpezar?.nota, TOPE_FALTA_GRAVE);
  assert.equal(sinEmpezar?.veredicto, "insuficiente");
  assert.deepEqual(sinEmpezar?.motivos, ["sin_empezar"]);
  assert.equal(notaDeTrabajo({ ...trabajo(), t6: "sin_empezar" }), 84);
  assert.equal(notaDeTrabajo({ ...trabajo(), t5: "documentar_evento", t6: "no_aplica" }), 100);
  assert.equal(notaDeTrabajo({ ...trabajo(), t5: "pintar" }), 100);
  assert.equal(calificar(100, []).nota, 100);

  const etiquetasEscena = etiquetasDe(entrada({ ...trabajo(), t5: "documentar_evento", t6: "no_aplica" }));
  const etiquetasVacias = etiquetasDe(entrada({ ...trabajo(), t6: "sin_empezar" }));
  assert.equal(etiquetasEscena.some((etiqueta) => etiqueta.id === "cap_sin_empezar"), false);
  assert.equal(etiquetasEscena.some((etiqueta) => etiqueta.id === "finished"), false);
  assert.equal(etiquetasVacias.some((etiqueta) => etiqueta.id === "cap_sin_empezar"), true);
});

test("el tope de sin empezar sigue igual con el interruptor apagado o encendido", () => {
  for (const evento of [false, true]) {
    assert.equal(preguntasEventoActivas(evento ? { HYTO_MILE_PREGUNTAS_EVENTO: "on" } : {}), evento);
    const nota = cerrado({ ...trabajo(), t6: "sin_empezar" })?.nota;
    assert.equal(nota, TOPE_FALTA_GRAVE);
  }
  const otraCosa = cerrado({ ...trabajo(), t5: "documentar_evento", t6: "no_aplica", v1: "es_otra_cosa" });
  assert.equal(otraCosa?.nota, TOPE_FALTA_GRAVE);
  assert.deepEqual(otraCosa?.motivos, ["no_coincide"]);
});

test("la lectura y el snapshot aceptan las opciones nuevas y rechazan una etiqueta desconocida", () => {
  const leido = leerTrabajo({
    answers: {
      ...respuestas(),
      t5: { choice: "documentar_evento" },
      t6: { choice: "no_aplica" },
    },
  });
  assert.equal(leido?.t5, "documentar_evento");
  assert.equal(leido?.t6, "no_aplica");
  assert.equal(leerTrabajo({ answers: { ...respuestas(), t6: { choice: "pintar" } } }), null);
  const detalle = {
    clase: "trabajo" as const,
    trabajo: { ...trabajo(), t5: "documentar_evento" as const, t6: "no_aplica" as const },
    factura: null,
    cerca: [] as string[],
  };
  const texto = escribirSnapshot(detalle);
  assert.match(texto, /t5=documentar_evento/);
  assert.match(texto, /t6=no_aplica/);
  assert.deepEqual(leerSnapshot(texto), detalle);
  assert.equal(leerSnapshot(texto.replace("t6=no_aplica", "t6=sin_empezar"))?.trabajo?.t6, "sin_empezar");
});

test("Laya recibe las opciones solo cuando el interruptor está on", async () => {
  const apagado = await preguntasEnviadas(undefined);
  const encendido = await preguntasEnviadas("on");
  const otro = await preguntasEnviadas("true");
  assert.equal("documentar_evento" in (apagado.t5?.criteria ?? {}), false);
  assert.equal("no_aplica" in (apagado.t6?.criteria ?? {}), false);
  assert.equal("documentar_evento" in (encendido.t5?.criteria ?? {}), true);
  assert.equal("no_aplica" in (encendido.t6?.criteria ?? {}), true);
  assert.equal("no_aplica" in (otro.t6?.criteria ?? {}), false);
});

function cerrado(respuestas: RespuestasTrabajo) {
  return cerrar(
    "trabajo",
    null,
    { texto: "A group photo with the banners. Everything requested is present.", monto: null, fecha: null },
    senalesDeTrabajo(respuestas, PEDIDO),
    "scout",
  );
}

function entrada(respuestas: RespuestasTrabajo) {
  return {
    clase: "trabajo" as const,
    trabajo: respuestas,
    factura: null,
    descripcion: "A group photo with the banners. Everything requested is present.",
    cerca: [],
    monto: null,
    fecha: null,
    tope: null,
    condicion: PEDIDO,
  };
}

function trabajo(): RespuestasTrabajo {
  return {
    lugar: "stand_o_mesa",
    v1: "es_lo_pedido",
    v2: 2,
    v3: true,
    v4: false,
    t5: "armar_o_montar",
    t6: "terminado",
    t7: true,
    t8: true,
    t9: false,
    t10: 2,
  };
}

function respuestas(): Record<string, unknown> {
  return {
    lugar: { choice: "stand_o_mesa" },
    v1: { choice: "es_lo_pedido" },
    v2: { score: 2 },
    v3: { noul: true },
    v4: { noul: false },
    t5: { choice: "armar_o_montar" },
    t6: { choice: "terminado" },
    t7: { noul: true },
    t8: { noul: true },
    t9: { noul: false },
    t10: { score: 2 },
  };
}

async function preguntasEnviadas(valor: string | undefined) {
  const previo = process.env[ENV];
  if (valor === undefined) delete process.env[ENV];
  else process.env[ENV] = valor;
  try {
    let preguntas: Record<string, { criteria?: Record<string, string> }> | null = null;
    await preguntarLaya("https://laya.example", "A group photo with banners.", PEDIDO, async (_input, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as {
        questions: Record<string, { criteria?: Record<string, string> }>;
      };
      if ("c1" in cuerpo.questions) return Response.json({ answers: { c1: { choice: "trabajo" } } });
      preguntas = cuerpo.questions;
      return Response.json({ answers: respuestas() });
    });
    assert.ok(preguntas);
    return preguntas;
  } finally {
    if (previo === undefined) delete process.env[ENV];
    else process.env[ENV] = previo;
  }
}
