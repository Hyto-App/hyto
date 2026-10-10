import assert from "node:assert/strict";
import test from "node:test";
import { tareasSemilla } from "../db/semilla";
import { preguntarLaya } from "./laya";
import { revisar } from "./revisar";
import {
  claseConTipoDeTarea,
  tipoGroqEscrito,
  tipoPorTareaActivo,
  type ClaseCamino,
} from "./tipo-por-tarea";

/** The coin flip from the exam: factura wins by 0.02. */
const C1_PAREADA = { probabilities: { trabajo: 0.33, factura: 0.35, otra: 0.32 } };
const C1_CLARA_FACTURA = { probabilities: { trabajo: 0.1, factura: 0.8, otra: 0.1 } };

const TEXTO_TRABAJO = [
  "Evidence type: work, a place, or a scene the organizer asked to see.",
  "Readable photo: yes.",
  "Missing from the photo: none.",
  "Description: People on laptops with Cursor on the screen.",
].join("\n");

const TEXTO_RECIBO = "Evidence type: a receipt or an invoice.\nTotal as printed: ₡7.950,00.";
const TEXTO_OTRA = "Evidence type: something other than the requested work or a receipt.\nDescription: A selfie.";
const TEXTO_SIN_TIPO = "People on laptops with Cursor on the screen.";

const FOTO = { tipo: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) };

test("el interruptor solo prende con on", () => {
  assert.equal(tipoPorTareaActivo({}), false);
  assert.equal(tipoPorTareaActivo({ HYTO_MILE_TIPO_POR_TAREA: "" }), false);
  assert.equal(tipoPorTareaActivo({ HYTO_MILE_TIPO_POR_TAREA: "off" }), false);
  assert.equal(tipoPorTareaActivo({ HYTO_MILE_TIPO_POR_TAREA: "true" }), false);
  assert.equal(tipoPorTareaActivo({ HYTO_MILE_TIPO_POR_TAREA: "1" }), false);
  assert.equal(tipoPorTareaActivo({ HYTO_MILE_TIPO_POR_TAREA: "on" }), true);
  assert.equal(tipoPorTareaActivo({ HYTO_MILE_TIPO_POR_TAREA: "ON" }), true);
  assert.equal(tipoPorTareaActivo({ HYTO_MILE_TIPO_POR_TAREA: " on " }), true);
});

test("lee el tipo que Groq ya escribió y no confunde otra con trabajo", () => {
  assert.equal(tipoGroqEscrito(TEXTO_TRABAJO), "trabajo");
  assert.equal(tipoGroqEscrito(TEXTO_RECIBO), "factura");
  assert.equal(tipoGroqEscrito(TEXTO_OTRA), "otra");
  assert.equal(tipoGroqEscrito("Evidence type: not stated.\nDescription: A photo."), null);
  assert.equal(tipoGroqEscrito(TEXTO_SIN_TIPO), null);
});

test("tarea de trabajo y Groq trabajo no van a factura, aunque c1 gane claro", () => {
  const entrada = { tipoTarea: "trabajo" as const, texto: TEXTO_TRABAJO, c1Cerca: true };
  assert.equal(claseConTipoDeTarea("factura", entrada), "trabajo");
  assert.equal(claseConTipoDeTarea("factura", { ...entrada, c1Cerca: false }), "trabajo");
  assert.equal(claseConTipoDeTarea("trabajo", entrada), "trabajo");
});

test("un c1 parejo sin acuerdo usa el tipo de la tarea", () => {
  assert.equal(
    claseConTipoDeTarea("factura", { tipoTarea: "trabajo", texto: TEXTO_SIN_TIPO, c1Cerca: true }),
    "trabajo",
  );
  assert.equal(
    claseConTipoDeTarea("trabajo", { tipoTarea: "reembolso", texto: TEXTO_SIN_TIPO, c1Cerca: true }),
    "factura",
  );
  assert.equal(
    claseConTipoDeTarea("factura", { tipoTarea: "reembolso", texto: TEXTO_TRABAJO, c1Cerca: true }),
    "factura",
  );
});

test("un c1 claro sigue eligiendo cuando la tarea y Groq no coinciden en trabajo", () => {
  assert.equal(
    claseConTipoDeTarea("factura", { tipoTarea: "trabajo", texto: TEXTO_SIN_TIPO, c1Cerca: false }),
    "factura",
  );
  assert.equal(
    claseConTipoDeTarea("trabajo", { tipoTarea: "reembolso", texto: TEXTO_SIN_TIPO, c1Cerca: false }),
    "trabajo",
  );
});

test("un recibo que Groq nombró sigue en factura, y otra no cambia de camino", () => {
  assert.equal(
    claseConTipoDeTarea("trabajo", { tipoTarea: "trabajo", texto: TEXTO_RECIBO, c1Cerca: true }),
    "factura",
  );
  assert.equal(
    claseConTipoDeTarea("otra", { tipoTarea: "trabajo", texto: TEXTO_TRABAJO, c1Cerca: true }),
    "otra",
  );
  assert.equal(
    claseConTipoDeTarea("factura", { tipoTarea: null, texto: TEXTO_TRABAJO, c1Cerca: true }),
    "trabajo",
  );
});

test("apagado, un c1 que gana por 0,02 manda la foto de trabajo a factura", async () => {
  const ids = await caminos("trabajo", TEXTO_TRABAJO, C1_PAREADA, false);
  assert.deepEqual(ids[0], ["c1"]);
  assert.equal(ids[1].includes("f1"), true);
  assert.equal(ids[1].includes("t10"), false);
});

test("prendido, la misma foto de trabajo (casos 17, 31 y 33) va a las preguntas de trabajo", async () => {
  const ids = await caminos("trabajo", TEXTO_TRABAJO, C1_PAREADA, true);
  assert.deepEqual(ids[0], ["c1"]);
  assert.equal(ids[1].includes("t10"), true);
  assert.equal(ids[1].includes("f1"), false);
  assert.equal(ids[1].includes("f2"), false);
});

test("prendido, un c1 claro de factura sigue en factura si Groq no dijo trabajo", async () => {
  const ids = await caminos("trabajo", TEXTO_SIN_TIPO, C1_CLARA_FACTURA, true);
  assert.equal(ids[1].includes("f1"), true);
});

test("prendido, un reembolso que Groq leyó como trabajo y c1 parejo se queda en factura", async () => {
  const ids = await caminos("reembolso", TEXTO_TRABAJO, C1_PAREADA, true);
  assert.equal(ids[1].includes("f1"), true);
  assert.equal(ids[1].includes("t10"), false);
});

test("prendido, otra parejo sigue en 0 si tampoco coincide con el pedido", async () => {
  const senales = await preguntarLaya(
    "https://laya.example",
    TEXTO_TRABAJO,
    "Banner visible and the table set up",
    async (_input, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
      if ("c1" in cuerpo.questions && !("v1" in cuerpo.questions)) {
        return Response.json({ answers: { c1: { probabilities: { trabajo: 0.32, factura: 0.33, otra: 0.35 } } } });
      }
      return Response.json({ answers: { ...respuestasTrabajo(), v1: { choice: "es_otra_cosa" } } });
    },
    undefined,
    undefined,
    null,
    { tipoTarea: "trabajo", tipoPorTarea: true },
  );
  assert.equal(senales.choice, "otra");
  assert.equal(senales.score, "0");
});

test("prendido, un recibo que Laya llama trabajo se puntúa como factura", async () => {
  const ids = await caminos("trabajo", TEXTO_RECIBO, { probabilities: { trabajo: 0.35, factura: 0.33, otra: 0.32 } }, true);
  assert.equal(ids[1].includes("f1"), true);
});

test("la revisión usa el tipo de la tarea solo cuando el interruptor está prendido", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  assert.equal(tarea.tipo, "trabajo");
  const porDefecto = await revisarConC1(tarea);
  const apagada = await revisarConC1(tarea, false);
  const prendida = await revisarConC1(tarea, true);
  assert.equal(porDefecto.segunda.includes("f1"), true);
  assert.equal(porDefecto.choice, "factura");
  assert.equal(apagada.segunda.includes("f1"), true);
  assert.equal(apagada.choice, "factura");
  assert.match(apagada.estado, /Evidence type: work, a place, or a scene/);
  assert.equal(prendida.segunda.includes("t10"), true);
  assert.equal(prendida.segunda.includes("f2"), false);
  assert.equal(prendida.choice, "trabajo");
});

async function caminos(
  tipoTarea: "trabajo" | "reembolso",
  texto: string,
  c1: { probabilities: Record<string, number> },
  tipoPorTarea: boolean,
): Promise<string[][]> {
  const ids: string[][] = [];
  const senales = await preguntarLaya(
    "https://laya.example",
    texto,
    "Photo of people working on laptops",
    async (_input, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
      const claves = Object.keys(cuerpo.questions);
      ids.push(claves);
      if (claves.includes("c1") && !claves.includes("f1") && !claves.includes("t10")) {
        return Response.json({ answers: { c1 } });
      }
      if (claves.includes("f1")) return Response.json({ answers: respuestasFactura() });
      return Response.json({ answers: respuestasTrabajo() });
    },
    undefined,
    undefined,
    null,
    { tipoTarea, tipoPorTarea },
  );
  const esperada: ClaseCamino = ids[1]?.includes("f1") ? "factura" : "trabajo";
  assert.equal(senales.choice, esperada);
  assert.equal(ids.length, 2);
  return ids;
}

async function revisarConC1(
  tarea: NonNullable<ReturnType<typeof tareasSemilla>[number]>,
  tipoPorTarea?: boolean,
): Promise<{ segunda: string[]; choice: string; estado: string }> {
  const ids: string[][] = [];
  let estado = "";
  const resultado = await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    tipoPorTarea,
    fetchImpl: async (input, init) => {
      if (String(input).includes("groq")) {
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tipo: "trabajo",
                  pais: null,
                  moneda: null,
                  monto_original: null,
                  monto_usd: null,
                  fecha: null,
                  comercio: null,
                  articulos: ["laptops"],
                  texto_completo: "People on laptops with Cursor on the screen in a warm room.",
                  legible: true,
                  faltantes: [],
                }),
              },
            },
          ],
        });
      }
      const cuerpo = JSON.parse(String(init?.body)) as { state?: string; questions: Record<string, unknown> };
      const claves = Object.keys(cuerpo.questions);
      ids.push(claves);
      estado = cuerpo.state ?? estado;
      if (claves.includes("c1") && !claves.includes("f1") && !claves.includes("t10")) {
        return Response.json({ answers: { c1: C1_PAREADA } });
      }
      if (claves.includes("f1")) return Response.json({ answers: respuestasFactura() });
      return Response.json({ answers: respuestasTrabajo() });
    },
  });
  assert.equal(ids.length, 2);
  return { segunda: ids[1] ?? [], choice: resultado.choice, estado };
}

function respuestasTrabajo(): Record<string, unknown> {
  return {
    lugar: { choice: "espacio_abierto" },
    v1: { choice: "es_lo_pedido" },
    v2: { probabilities: { "0": 0.05, "1": 0.1, "2": 0.85 } },
    v3: { noul: 0.91 },
    v4: { noul: 0.1 },
    t5: { choice: "armar_o_montar" },
    t6: { choice: "terminado" },
    t7: { noul: false },
    t8: { noul: 0.8 },
    t9: { noul: 0.2 },
    t10: { probabilities: { "0": 0.05, "1": 0.15, "2": 0.8 } },
  };
}

function respuestasFactura(): Record<string, unknown> {
  return {
    f1: { choice: "coincide_con_lo_pedido" },
    f2: { noul: false },
    f3: { noul: false },
    f4: { score: 1 },
    g1: { choice: "otro_o_no_claro" },
    g2: { noul: false },
    g3: { noul: false },
    g4: { noul: true },
    g5: { score: 1 },
  };
}
