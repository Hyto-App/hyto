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
  assert.match(encendido.t5.instructions, /elija documentar_evento/i);
  assert.match(encendido.t5.instructions, /Ejemplo: un letrero/);
  assert.match(encendido.t5.criteria.documentar_evento ?? "", /Documentar un evento/);
  assert.match(encendido.t5.criteria.documentar_evento ?? "", /Ejemplo: el letrero de la entrada/);
  assert.match(encendido.t5.criteria.pintar ?? "", /no es pintar/);
  assert.deepEqual(Object.keys(encendido.t6.criteria), ["terminado", "a_medias", "sin_empezar", "no_aplica", "no_claro"]);
  assert.match(encendido.t6.instructions, /elija no_aplica/i);
  assert.match(encendido.t6.instructions, /No elija sin_empezar/);
  assert.match(encendido.t6.criteria.no_aplica ?? "", /No aplica: es una escena o un evento/);
  assert.match(encendido.t6.criteria.no_aplica ?? "", /Ejemplo: la foto de grupo con los banners/);
  assert.match(encendido.t6.criteria.sin_empezar ?? "", /pared vacía/);
  assert.notEqual(encendido.t6.criteria.sin_empezar, apagado.t6.criteria.sin_empezar);
});

test("los casos 21 y 07 del examen suben si t6 es no_aplica, y sin empezar sigue en 49", () => {
  // Saved Laya answers from the 2026-10-08 exam (resumen-casos). s1 is score index 1.
  // A noul of 0.5 or more is yes. Groq on case 21: faltantes empty, "All requested
  // elements, including the group and the banners, are present."
  const caso21 = examen({
    lugar: "pared_o_superficie",
    v2: 1,
    v3: true,
    v4: true,
    t5: "otra_o_no_claro",
    t6: "sin_empezar",
    t7: false,
    t8: true,
    t9: false,
    t10: 1,
  });
  const caso07 = examen({
    lugar: "no_claro",
    v2: 1,
    v3: true,
    v4: true,
    t5: "otra_o_no_claro",
    t6: "sin_empezar",
    t7: false,
    t8: false,
    t9: false,
    t10: 1,
  });
  const condicion21 = "Foto del grupo con los banners";
  const condicion07 = "Foto del expositor en el auditorio";

  const guardado21 = cerrado(caso21, condicion21);
  const guardado07 = cerrado(caso07, condicion07);
  assert.equal(guardado21?.nota, 49);
  assert.equal(guardado21?.veredicto, "insuficiente");
  assert.deepEqual(guardado21?.motivos, ["sin_empezar"]);
  assert.equal(guardado07?.nota, 46);
  assert.equal(guardado07?.veredicto, "insuficiente");
  assert.deepEqual(guardado07?.motivos, ["sin_empezar"]);

  const evento21 = cerrado({ ...caso21, t5: "documentar_evento", t6: "no_aplica" }, condicion21);
  const evento07 = cerrado({ ...caso07, t5: "documentar_evento", t6: "no_aplica" }, condicion07);
  assert.equal(evento21?.nota, 77);
  assert.equal(evento21?.veredicto, "parcial");
  assert.equal(evento21?.motivos, undefined);
  assert.equal(evento07?.nota, 64);
  assert.equal(evento07?.veredicto, "parcial");
  assert.equal((evento07?.motivos ?? []).includes("sin_empezar"), false);

  const sinEmpezar = cerrado({ ...caso21, t5: "pintar", t6: "sin_empezar" }, "Pintar el mural en la pared");
  assert.equal(sinEmpezar?.nota, 49);
  assert.deepEqual(sinEmpezar?.motivos, ["sin_empezar"]);
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

function cerrado(respuestas: RespuestasTrabajo, condicion = PEDIDO) {
  return cerrar(
    "trabajo",
    null,
    { texto: "A group photo with the banners. Everything requested is present.", monto: null, fecha: null },
    senalesDeTrabajo(respuestas, condicion),
    "scout",
  );
}

function examen(parcial: Pick<RespuestasTrabajo, "lugar" | "v2" | "v3" | "v4" | "t5" | "t6" | "t7" | "t8" | "t9" | "t10">): RespuestasTrabajo {
  return { v1: "es_lo_pedido", ...parcial };
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
    const capturas: Array<Record<string, { criteria?: Record<string, string> }>> = [];
    await preguntarLaya("https://laya.example", "A group photo with banners.", PEDIDO, async (_input, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as {
        questions: Record<string, { criteria?: Record<string, string> }>;
      };
      if ("c1" in cuerpo.questions) return Response.json({ answers: { c1: { choice: "trabajo" } } });
      capturas.push(cuerpo.questions);
      return Response.json({ answers: respuestas() });
    });
    const preguntas = capturas[0];
    if (!preguntas) throw new Error("no se enviaron las preguntas de trabajo");
    return preguntas;
  } finally {
    if (previo === undefined) delete process.env[ENV];
    else process.env[ENV] = previo;
  }
}
