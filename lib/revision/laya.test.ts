import assert from "node:assert/strict";
import test from "node:test";
import { cerrar } from "./armar";
import { FalloRevision } from "./fallo";
import {
  corregirFactura,
  cuerpoLaya,
  esReciboEscrito,
  leerClase,
  leerFactura,
  leerTrabajo,
  preguntarLaya,
  preguntasClasificacion,
  preguntasFactura,
  preguntasTrabajo,
  senalesDeFactura,
  senalesDeTrabajo,
  urlLaya,
  type RespuestasFactura,
  type RespuestasTrabajo,
} from "./laya";

const PEDIDO = "Banner visible and the table set up";

test("la URL de Laya apunta a systemone", () => {
  assert.equal(urlLaya("https://ejemplo.ts.net"), "https://ejemplo.ts.net/v1/systemone");
  assert.equal(urlLaya("https://ejemplo.ts.net/v1/systemone/"), "https://ejemplo.ts.net/v1/systemone");
});

test("C1 clasifica la descripción con las tres etiquetas y el pedido", () => {
  const cuerpo = leerCuerpo(cuerpoLaya("A blank wall.", PEDIDO, preguntasClasificacion(PEDIDO)));
  assert.equal(cuerpo.model, "multilingual");
  assert.equal(cuerpo.state, `A blank wall.\nCondition: ${PEDIDO}`);
  assert.deepEqual(Object.keys(cuerpo.questions), ["c1"]);
  const c1 = cuerpo.questions.c1;
  assert.equal(c1.type, "choice");
  assert.equal(
    c1.instructions,
    `What kind of evidence does the written description give? The organizer asked for: ${PEDIDO}. Pick one label. Use only what the description states. A receipt, invoice, or purchase is factura, never trabajo.`,
  );
  assert.deepEqual(c1.criteria, {
    trabajo:
      "The description shows a place or a physical result of work, such as a wall, a stand, a cleaned area, people working, or other evidence that matches what the organizer asked for.",
    factura:
      "The description shows a receipt or an invoice, a paper or screen with a store name, items, and a price. If it is a purchase, pick factura even when the request sounds like an errand.",
    otra: `The description shows neither work, a receipt, nor what the organizer asked for (${PEDIDO}). For example, a selfie, a blurry image, or an unrelated scene.`,
  });
});

test("un trabajo manda las once preguntas y los niveles de score en orden", () => {
  const preguntas = preguntasTrabajo(`  ${PEDIDO}  `);
  assert.deepEqual(Object.keys(preguntas), ["lugar", "v1", "v2", "v3", "v4", "t5", "t6", "t7", "t8", "t9", "t10"]);
  assert.equal(preguntas.lugar.instructions, "Which place does the written description show? Pick one label. Use only what the description states.");
  assert.equal(preguntas.lugar.criteria.pared_o_superficie, "A wall, floor, fence, or other surface that was painted, cleaned, or fixed.");
  assert.equal(preguntas.lugar.criteria.stand_o_mesa, "A stand, table, or booth set up with items.");
  assert.equal(preguntas.lugar.criteria.espacio_abierto, "An outdoor area, street, park, or yard.");
  assert.equal(preguntas.lugar.criteria.no_claro, "The place is not stated or is too vague.");
  assert.equal(preguntas.v1.instructions, `The organizer asked for: ${PEDIDO}. Does the written description match this request?`);
  assert.deepEqual(Object.keys(preguntas.v1.criteria), ["es_lo_pedido", "es_otra_cosa", "no_se_puede_saber"]);
  assert.equal(preguntas.v2.instructions, `The organizer asked for: ${PEDIDO}. How many parts of this request does the written description clearly state?`);
  assert.equal(preguntas.v3.instructions, `The organizer asked for: ${PEDIDO}. Does the written description name a place, an object, or an action that proves it?`);
  assert.equal(
    preguntas.v4.instructions,
    `The organizer asked for: ${PEDIDO}. Does the written description say that something the organizer asked for is missing or not shown?`,
  );
  assert.equal(preguntas.t5.instructions, "What was done, according to the written description? Pick one label. Use only what the description states.");
  assert.equal(preguntas.t5.criteria.pintar, "Something was painted or drawn.");
  assert.equal(preguntas.t5.criteria.limpiar, "An area was cleaned or cleared of trash.");
  assert.equal(preguntas.t5.criteria.armar_o_montar, "Something was built, set up, or assembled, such as a stand or a booth.");
  assert.equal(preguntas.t5.criteria.vender_o_atender, "People were selling, serving, or attending visitors.");
  assert.equal(preguntas.t5.criteria.transportar, "Items or people were moved from one place to another.");
  assert.equal(preguntas.t5.criteria.otra_o_no_claro, "Something else, or the description does not say.");
  assert.equal(
    preguntas.t6.instructions,
    "In what condition is the finished work, according to the written description? Pick one label. Use only what the description states.",
  );
  assert.equal(preguntas.t6.criteria.terminado, "The description says the work is finished or complete.");
  assert.equal(preguntas.t6.criteria.a_medias, "The description says part of the work is done and part is missing or still in progress.");
  assert.equal(preguntas.t6.criteria.sin_empezar, "The description shows no work done, such as an empty wall or an empty room.");
  assert.equal(preguntas.t6.criteria.no_claro, "The description does not say.");
  assert.equal(preguntas.t7.instructions, "Does the written description name the tools or materials used, such as brushes, paint, trash bags, tables, or a vehicle?");
  assert.equal(preguntas.t8.instructions, "Does the written description say that the work was done in the place the organizer asked for?");
  assert.equal(preguntas.t9.instructions, "Does the written description say that any part of the work is unfinished, damaged, or not visible?");
  assert.equal(preguntas.t10.instructions, "Overall, how well does the written description show that the organizer's request was done?");
  assertListaDeTres(preguntas.v2.criteria, [
    "None. The description clearly states no part of the request.",
    "Some. The description clearly states only some parts of the request.",
    "All. The description clearly states every part of the request.",
  ]);
  assertListaDeTres(preguntas.t10.criteria, [
    "The description does not show the request was done.",
    "The description shows part of the request, and something is missing.",
    "The description shows the whole request was done.",
  ]);
  assert.equal(preguntas.v1.criteria.es_lo_pedido.includes(PEDIDO), false);
});

test("una factura manda las nueve preguntas y no inventa un pedido distinto", () => {
  const pedido = "Photo of the meal receipt";
  const preguntas = preguntasFactura(pedido);
  assert.deepEqual(Object.keys(preguntas), ["f1", "f2", "f3", "f4", "g1", "g2", "g3", "g4", "g5"]);
  assert.equal(preguntas.f1.instructions, `The organizer asked for a receipt for: ${pedido}. What was the money spent on, according to the written description?`);
  assert.deepEqual(Object.keys(preguntas.f1.criteria), ["coincide_con_lo_pedido", "otro_gasto", "no_se_ve"]);
  assert.equal(preguntas.f2.instructions, "Does the written description state the total amount paid, as a number?");
  assert.equal(preguntas.f3.instructions, "Does the written description state the date of the purchase?");
  assert.equal(preguntas.f4.instructions, `The organizer asked for a receipt that shows: ${pedido}. How many of the required details does the written description state?`);
  assert.equal(preguntas.g1.instructions, `The organizer asked for: ${pedido}. According to the written description, what category is the expense?`);
  assert.equal(preguntas.g1.criteria.transporte, "Fuel, bus fare, taxi, parking, or tolls.");
  assert.equal(preguntas.g1.criteria.comida_o_bebida, "Food, drinks, or snacks.");
  assert.equal(preguntas.g1.criteria.materiales, "Paint, tools, supplies, or building materials.");
  assert.equal(preguntas.g1.criteria.impresion_o_papeleria, "Printing, paper, posters, or stationery.");
  assert.equal(preguntas.g1.criteria.otro_o_no_claro, "Anything else, or the description does not say.");
  assert.equal(
    preguntas.g2.instructions,
    `The organizer asked for: ${pedido}. Is the expense category a reasonable cost for this task? For example, fuel for a transport task, or paint for a painting task.`,
  );
  assert.equal(
    preguntas.g3.instructions,
    "Does the written description name at least one item that was bought, such as fuel, paint, or food? Answer yes when any item is named, including in an Items list. Do not answer no if an item is named.",
  );
  assert.equal(preguntas.g4.instructions, "Does the written description name the store or business where the purchase was made?");
  assert.equal(preguntas.g5.instructions, `Overall, how well does the written description show that this expense fits the organizer's request: ${pedido}?`);
  assertListaDeTres(preguntas.f4.criteria, [
    "None. The description states none of the required details.",
    "Some. The description states only some of the required details.",
    "All. The description states every required detail.",
  ]);
  assertListaDeTres(preguntas.g5.criteria, [
    "The expense does not fit the request, or the description does not say what was bought.",
    "The expense could fit the request, but an item, an amount, or a date is missing.",
    "The expense clearly fits the request, and it states the item, the amount, and the date.",
  ]);
  assert.equal("t10" in preguntas, false);
});

test("un trabajo con todas las respuestas a favor queda en 100", () => {
  const cumplido = senalesDeTrabajo({ ...trabajoBase(), t7: true });
  assert.deepEqual(cumplido, { choice: "trabajo", noul: true, score: "100" });
});

test("una respuesta floja resta solo su peso y no borra el resto", () => {
  assert.equal(senalesDeTrabajo(trabajoBase()).score, "99");
  assert.equal(senalesDeTrabajo(trabajoBase()).noul, false);
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t7: true, t10: 0 }).score, "92");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), v4: true }).score, "89");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t9: true }).score, "89");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), v3: false }).score, "95");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), v4: true, t9: true }).noul, false);
});

test("el crédito parcial de un trabajo es la mitad del peso", () => {
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), v1: "es_otra_cosa" }).score, "79");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), v1: "no_se_puede_saber" }).score, "89");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t6: "sin_empezar" }).score, "83");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t6: "a_medias" }).score, "91");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), v2: 0 }).score, "83");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), v2: 1 }).score, "91");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t8: false }, "Set the table at the entrance").score, "87");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t8: false }, "Hacer un ensayo").score, "99");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t7: true, t8: false }, "Hacer un ensayo").score, "100");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t7: true, t8: false }, "Pintar el mural en el parque").score, "88");
});

test("preguntarLaya pasa el pedido: t8 no resta si no hay lugar", async () => {
  const respuestas = { ...respuestasTrabajo(), t7: { noul: true }, t8: { noul: false } };
  const pedir = async (pedido: string) =>
    preguntarLaya("https://laya.example", "An essay on the desk.", pedido, async (_input, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
      if ("c1" in cuerpo.questions && !("t8" in cuerpo.questions)) {
        return Response.json({ answers: { c1: { choice: "trabajo" } } });
      }
      return Response.json({ answers: respuestas });
    });
  assert.equal((await pedir("Hacer un ensayo")).score, "100");
  assert.equal((await pedir("Pintar el mural en el parque")).score, "88");
});

test("nombrar herramientas suma un punto", () => {
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t7: false }).score, "99");
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t7: true, t10: 1 }).score, "96");
});

test("una factura con todas las respuestas a favor queda en 100", () => {
  const cumplida = senalesDeFactura(facturaBase());
  assert.deepEqual(cumplida, { choice: "factura", noul: true, score: "100" });
  const sinCierre = senalesDeFactura({ ...facturaBase(), g5: 0, g2: true });
  assert.equal(sinCierre.score, "90");
  assert.equal(sinCierre.noul, false);
});

test("un gasto que no es razonable resta sus 20 puntos", () => {
  const senales = senalesDeFactura({ ...facturaBase(), g2: false });
  assert.equal(senales.score, "80");
  assert.equal(senales.noul, false);
});

test("cada pregunta de la factura resta solo su peso", () => {
  assert.equal(senalesDeFactura({ ...facturaBase(), f1: "otro_gasto" }).score, "82");
  assert.equal(senalesDeFactura({ ...facturaBase(), f1: "no_se_ve" }).score, "91");
  assert.equal(senalesDeFactura({ ...facturaBase(), f4: 0 }).score, "86");
  assert.equal(senalesDeFactura({ ...facturaBase(), f4: 1 }).score, "93");
  assert.equal(senalesDeFactura({ ...facturaBase(), f2: false }).score, "90");
  assert.equal(senalesDeFactura({ ...facturaBase(), f3: false }).score, "90");
  assert.equal(senalesDeFactura({ ...facturaBase(), g3: false }).score, "90");
  assert.equal(senalesDeFactura({ ...facturaBase(), g4: false }).score, "98");
});

test("un reembolso sobre el tope no llega a Completado aunque el cuestionario sume 100", () => {
  const senales = senalesDeFactura(facturaBase());
  const cerrado = cerrar("reembolso", "10", { texto: "Receipt for 20 dollars.", monto: "20.00", fecha: "2026-09-27" }, senales, "scout");
  assert.equal(senales.score, "100");
  assert.equal(cerrado?.nota, 79);
  assert.equal(cerrado?.score, "79");
  assert.equal(cerrado?.veredicto, "parcial");
  assert.equal(cerrado?.noul, false);
});

test("lee la clase y el camino desde answers, no desde la primera pregunta que encuentre", () => {
  assert.equal(leerClase({ answers: { c1: { choice: "factura" }, lugar: { choice: "stand_o_mesa" } } }), "factura");
  const trabajo = leerTrabajo({
    answers: {
      ...respuestasTrabajo(),
      t10: { type: "score", score: 1.8, probabilities: { "0": 0.1, "1": 0.2, "2": 0.7 } },
      v2: { type: "score", score: 0.2, probabilities: { "0": 0.8, "1": 0.1, "2": 0.1 } },
    },
  });
  assert.equal(trabajo?.t10, 2);
  assert.equal(trabajo?.v2, 0);
  assert.equal(leerTrabajo({ answers: { t10: { probabilities: { "0": 0.9, "1": 0.1, "2": 0 } } } }), null);
});

test("un empate de score se queda en el nivel más bajo", () => {
  const trabajo = leerTrabajo({
    answers: { ...respuestasTrabajo(), t10: { probabilities: [0.4, 0.2, 0.4] } },
  });
  assert.equal(trabajo?.t10, 0);
  assert.equal(senalesDeTrabajo({ ...trabajoBase(), t10: 0 }).score, "91");
});

test("un empate de etiquetas no elige camino", () => {
  assert.equal(leerClase({ answers: { c1: { probabilities: { trabajo: 0.5, factura: 0.5, otra: 0 } } } }), null);
  assert.equal(leerFactura({ answers: { f1: { probabilities: { otro_gasto: 0.4, no_se_ve: 0.4 } } } }), null);
});

test("un noul de exactamente 0,5 cuenta como sí", () => {
  const enElCorte = leerTrabajo({ answers: { ...respuestasTrabajo(), v3: { noul: 0.5 } } });
  assert.equal(enElCorte?.v3, true);
  const debajo = leerTrabajo({ answers: { ...respuestasTrabajo(), v3: { noul: 0.499 } } });
  assert.equal(debajo?.v3, false);
});

test("un noul de 0,99 en V4 es sí y baja el veredicto", () => {
  const trabajo = leerTrabajo({ answers: { ...respuestasTrabajo(), v4: { noul: 0.99 } } });
  assert.equal(trabajo?.v4, true);
  assert.ok(trabajo);
  assert.equal(senalesDeTrabajo(trabajo).score, "89");
});

test("sin URL Laya no está configurada", async () => {
  const error = await falloLaya("", async () => new Response("no"));
  assert.equal(error.code, "sin_clave");
  assert.match(error.mensaje, /not configured/);
});

test("un tiempo de Laya es tiempo", async () => {
  const error = await falloLaya("https://laya.example", async () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  });
  assert.equal(error.code, "tiempo");
});

test("un HTTP de Laya es error del proveedor", async () => {
  const error = await falloLaya("https://laya.example", async () => new Response("no", { status: 500 }));
  assert.equal(error.code, "proveedor");
  assert.equal(error.status, 500);
});

test("una respuesta de Laya que no se lee es respuesta", async () => {
  const error = await falloLaya("https://laya.example", async () => Response.json({ answers: { choice: { choice: "factura" } } }));
  assert.equal(error.code, "respuesta");
});

test("primero clasifica y después pregunta solo el camino de trabajo", async () => {
  const cuerpos: Array<{ questions: Record<string, { type: string; criteria?: unknown }> }> = [];
  const senales = await preguntarLaya("https://laya.example", "Table set up.", PEDIDO, async (_input, init) => {
    const cuerpo = JSON.parse(String(init?.body)) as (typeof cuerpos)[number];
    cuerpos.push(cuerpo);
    if (cuerpos.length === 1) return Response.json({ answers: { c1: { choice: "trabajo" } } });
    return Response.json({ answers: respuestasTrabajo() });
  });
  assert.equal(cuerpos.length, 2);
  assert.deepEqual(Object.keys(cuerpos[0].questions), ["c1"]);
  assert.equal(cuerpos[1].questions.t10?.type, "score");
  assert.equal(Array.isArray(cuerpos[1].questions.t10?.criteria), true);
  assert.equal((cuerpos[1].questions.t10?.criteria as unknown[]).length, 3);
  assert.equal("f1" in cuerpos[1].questions, false);
  assert.equal("g5" in cuerpos[1].questions, false);
  const { detalle, ...resto } = senales;
  assert.equal(detalle?.startsWith("c=trabajo"), true);
  assert.deepEqual(resto, { choice: "trabajo", noul: false, score: "99" });
});

test("una factura no dispara las preguntas de trabajo", async () => {
  const ids: string[][] = [];
  const senales = await preguntarLaya("https://laya.example", "Meal receipt 12.40.", "Photo of the meal receipt", async (_input, init) => {
    const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
    ids.push(Object.keys(cuerpo.questions));
    if (ids.length === 1) return Response.json({ answers: { c1: { choice: "factura" } } });
    return Response.json({ answers: respuestasFactura() });
  });
  assert.deepEqual(ids[1], ["f1", "f2", "f3", "f4", "g1", "g2", "g3", "g4", "g5"]);
  assert.equal(ids[1].includes("t10"), false);
  const { detalle, ...resto } = senales;
  assert.equal(detalle?.startsWith("c=factura"), true);
  assert.deepEqual(resto, { choice: "factura", noul: true, score: "100" });
});

test("otra que no coincide con el pedido sigue en 0 tras la pregunta de match", async () => {
  let llamadas = 0;
  const senales = await preguntarLaya("https://laya.example", "A blank wall.", PEDIDO, async (_input, init) => {
    llamadas += 1;
    const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
    if ("c1" in cuerpo.questions) return Response.json({ answers: { c1: { choice: "otra" } } });
    return Response.json({
      answers: {
        ...respuestasTrabajo(),
        v1: { choice: "es_otra_cosa" },
      },
    });
  });
  assert.equal(llamadas, 2);
  const { detalle, ...resto } = senales;
  assert.equal(detalle?.startsWith("c=otra"), true);
  assert.deepEqual(resto, { choice: "otra", noul: false, score: "0", motivos: ["otra"] });
});

test("otra que sí coincide con el pedido no se fuerza a 0", async () => {
  const pedido = "A photo of a hall full of people";
  let llamadas = 0;
  const senales = await preguntarLaya(
    "https://laya.example",
    "Young people dining in a large hall.",
    pedido,
    async (_input, init) => {
      llamadas += 1;
      const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
      if ("c1" in cuerpo.questions) {
        assert.match(String(cuerpo.questions.c1 && (cuerpo.questions.c1 as { instructions?: string }).instructions), /hall full of people/);
        return Response.json({ answers: { c1: { choice: "otra" } } });
      }
      return Response.json({
        answers: {
          ...respuestasTrabajo(),
          lugar: { choice: "espacio_abierto" },
          v1: { choice: "es_lo_pedido" },
          t5: { choice: "vender_o_atender" },
        },
      });
    },
  );
  assert.equal(llamadas, 2);
  const { detalle, ...resto } = senales;
  assert.equal(detalle?.startsWith("c=trabajo"), true);
  assert.equal(resto.choice, "trabajo");
  assert.notEqual(resto.score, "0");
  assert.equal("motivos" in resto, false);
  const cerrado = cerrar(
    "trabajo",
    null,
    { texto: "Young people dining in a large hall.", monto: null, fecha: null },
    senales,
    "scout",
  );
  assert.ok((cerrado?.nota ?? 0) > 0);
  assert.notEqual(cerrado?.veredicto, "insuficiente");
});

test("un selfie sin relación sigue insuficiente en 0", async () => {
  let llamadas = 0;
  const senales = await preguntarLaya("https://laya.example", "A close-up selfie with no work or receipt.", PEDIDO, async (_input, init) => {
    llamadas += 1;
    const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
    if ("c1" in cuerpo.questions) return Response.json({ answers: { c1: { choice: "otra" } } });
    return Response.json({
      answers: {
        lugar: { choice: "no_claro" },
        v1: { choice: "es_otra_cosa" },
        v2: { score: 0 },
        v3: { noul: false },
        v4: { noul: true },
        t5: { choice: "otra_o_no_claro" },
        t6: { choice: "sin_empezar" },
        t7: { noul: false },
        t8: { noul: false },
        t9: { noul: true },
        t10: { score: 0 },
      },
    });
  });
  assert.equal(llamadas, 2);
  const { detalle, ...resto } = senales;
  assert.equal(detalle?.startsWith("c=otra"), true);
  assert.deepEqual(resto, { choice: "otra", noul: false, score: "0", motivos: ["otra"] });
  const cerrado = cerrar(
    "trabajo",
    null,
    { texto: "A close-up selfie with no work or receipt.", monto: null, fecha: null },
    senales,
    "scout",
  );
  assert.equal(cerrado?.nota, 0);
  assert.equal(cerrado?.veredicto, "insuficiente");
});

test("un reembolso clasificado como otra sin match se queda en 0", async () => {
  let llamadas = 0;
  const senales = await preguntarLaya("https://laya.example", "Meal receipt for something else.", "Photo of the meal receipt", async (_input, init) => {
    llamadas += 1;
    const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
    if ("c1" in cuerpo.questions) return Response.json({ answers: { c1: { choice: "otra" } } });
    return Response.json({
      answers: {
        ...respuestasTrabajo(),
        v1: { choice: "es_otra_cosa" },
      },
    });
  });
  assert.equal(llamadas, 2);
  const { detalle, ...resto } = senales;
  assert.equal(detalle?.startsWith("c=otra"), true);
  assert.deepEqual(resto, { choice: "otra", noul: false, score: "0", motivos: ["otra"] });
  const cerrado = cerrar(
    "reembolso",
    "15",
    { texto: "Meal receipt for something else.", monto: "12.40", fecha: "2026-09-27" },
    senales,
    "scout",
  );
  assert.equal(cerrado?.nota, 0);
  assert.equal(cerrado?.veredicto, "insuficiente");
  assert.equal(cerrado?.score, "0");
});

test("si el segundo llamado falla, la revisión falla", async () => {
  let llamadas = 0;
  const error = await falloLaya("https://laya.example", async () => {
    llamadas += 1;
    if (llamadas === 1) return Response.json({ answers: { c1: { choice: "trabajo" } } });
    return new Response("no", { status: 502 });
  });
  assert.equal(llamadas, 2);
  assert.equal(error.code, "proveedor");
  assert.equal(error.status, 502);
});

test("un recibo que Laya llama trabajo se puntúa como factura y nombra los ítems", async () => {
  const texto = "Evidence type: a receipt or an invoice.\nItems: Arroz, Huevos.\nTotal as printed: ₡7.950,00.";
  assert.equal(esReciboEscrito(texto), true);
  const ids: string[][] = [];
  const senales = await preguntarLaya("https://laya.example", texto, "Photo of the meal receipt", async (_input, init) => {
    const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
    ids.push(Object.keys(cuerpo.questions));
    if (ids.length === 1) return Response.json({ answers: { c1: { choice: "trabajo" } } });
    return Response.json({ answers: { ...respuestasFactura(), g3: { noul: false } } });
  });
  assert.deepEqual(ids[1], ["f1", "f2", "f3", "f4", "g1", "g2", "g3", "g4", "g5"]);
  assert.equal(senales.choice, "factura");
  assert.match(senales.detalle ?? "", /g3=1/);
  const base = facturaBase();
  assert.equal(corregirFactura({ ...base, g3: false }, texto).g3, true);
  assert.equal(corregirFactura({ ...base, g3: false }, "Items: none named.").g3, false);
});

test("la regla del evento es una pregunta propia y un no baja la nota", async () => {
  const regla = "Only supermarket receipts count.";
  const cuerpos: Array<{ state: string; questions: Record<string, { instructions?: string }> }> = [];
  const pedir = (cumple: boolean) =>
    preguntarLaya(
      "https://laya.example",
      "Merchant: Super.\nItems: Milk.",
      "A receipt for food",
      async (_input, init) => {
        const cuerpo = JSON.parse(String(init?.body)) as (typeof cuerpos)[number];
        cuerpos.push(cuerpo);
        const ids = Object.keys(cuerpo.questions);
        if (ids.includes("c1") && !ids.includes("f1")) return Response.json({ answers: { c1: { choice: "factura" } } });
        return Response.json({ answers: { ...respuestasFactura(), r1: { noul: cumple } } });
      },
      undefined,
      undefined,
      regla,
    );
  const cumple = await pedir(true);
  const rompe = await pedir(false);
  assert.equal(cumple.score, "100");
  assert.equal(cumple.motivos, undefined);
  assert.deepEqual(rompe.motivos, ["regla_evento"]);
  assert.equal(rompe.score, "100");
  const factura = cuerpos.find((cuerpo) => "f1" in cuerpo.questions && "r1" in cuerpo.questions);
  assert.ok(factura);
  assert.match(factura.state, /Rule for this event: Only supermarket receipts count\./);
  assert.match(factura.questions.r1?.instructions ?? "", /Only supermarket receipts count\./);
  assert.equal(cuerpos.some((cuerpo) => "c1" in cuerpo.questions && "r1" in cuerpo.questions), false);
});

function assertListaDeTres(criterios: readonly string[], esperados: [string, string, string]) {
  assert.equal(Array.isArray(criterios), true);
  assert.deepEqual([...criterios], esperados);
}

function trabajoBase(): RespuestasTrabajo {
  return {
    lugar: "stand_o_mesa",
    v1: "es_lo_pedido",
    v2: 2,
    v3: true,
    v4: false,
    t5: "armar_o_montar",
    t6: "terminado",
    t7: false,
    t8: true,
    t9: false,
    t10: 2,
  };
}

function facturaBase(): RespuestasFactura {
  return {
    f1: "coincide_con_lo_pedido",
    f2: true,
    f3: true,
    f4: 2,
    g1: "comida_o_bebida",
    g2: true,
    g3: true,
    g4: true,
    g5: 2,
  };
}

function respuestasTrabajo(): Record<string, unknown> {
  return {
    lugar: { choice: "stand_o_mesa" },
    v1: { choice: "es_lo_pedido" },
    v2: { probabilities: { "0": 0.05, "1": 0.1, "2": 0.85 } },
    v3: { noul: 0.91 },
    v4: { noul: 0.1 },
    t5: { choice: "armar_o_montar" },
    t6: { choice: "terminado" },
    t7: { noul: false },
    t8: { noul: 0.8 },
    t9: { noul: 0.2 },
    t10: { probabilities: ["0.05", "0.15", "0.8"] },
  };
}

function respuestasFactura(): Record<string, unknown> {
  return {
    f1: { choice: "coincide_con_lo_pedido" },
    f2: { noul: 0.95 },
    f3: { noul: true },
    f4: { score: 2 },
    g1: { choice: "comida_o_bebida" },
    g2: { noul: 0.7 },
    g3: { noul: "yes" },
    g4: { noul: 0.6 },
    g5: { probabilities: { "0": 0.1, "1": 0.2, "2": 0.7 } },
  };
}

function leerCuerpo(cuerpo: unknown): {
  model: string;
  state: string;
  questions: { c1: { type: string; instructions: string; criteria: Record<string, string> } };
} {
  return cuerpo as {
    model: string;
    state: string;
    questions: { c1: { type: string; instructions: string; criteria: Record<string, string> } };
  };
}

async function falloLaya(base: string, fetchImpl: typeof fetch): Promise<FalloRevision> {
  try {
    await preguntarLaya(base, "texto", "condición", fetchImpl);
  } catch (error) {
    assert.ok(error instanceof FalloRevision);
    return error;
  }
  assert.fail("tenía que fallar");
}
