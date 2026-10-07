import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CARPETA_EXAMEN,
  clavesFaltantes,
  correrExamen,
  leerCasos,
  mensajeClaves,
  redactarExamen,
  rutaDeFoto,
  textoInforme,
  type CasoExamen,
} from "./examen-mile";

const FOTO = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

const QWEN = {
  tipo: "trabajo",
  pais: null,
  moneda: null,
  monto_original: null,
  monto_usd: null,
  fecha: null,
  comercio: null,
  articulos: ["handwritten essay", "title", "paragraphs"],
  texto_completo:
    "A sheet of paper with a handwritten essay. The title is at the top and several paragraphs fill the page. The ink is dark and every line is readable. The page is complete, with the start and the end of the text inside the frame. This is the handwritten essay the organizer asked for. Nothing requested is missing.",
  legible: true,
  faltantes: [],
};

const RESPUESTAS: Record<string, string | boolean | number> = {
  lugar: "stand_o_mesa",
  v1: "es_lo_pedido",
  v2: 2,
  v3: true,
  v4: false,
  t5: "vender_o_atender",
  t6: "terminado",
  t7: true,
  t8: true,
  t9: false,
  t10: 2,
};

test("los casos del examen se leen y el readme nombra cada archivo", () => {
  const casos = leerCasos(JSON.parse(readFileSync(`${CARPETA_EXAMEN}/casos.json`, "utf8")) as unknown);
  const readme = readFileSync(`${CARPETA_EXAMEN}/README.md`, "utf8");
  assert.equal(casos.length, 25);
  const ensayo = casos.find((caso) => caso.id === "ensayo-escrito-mano");
  assert.ok(ensayo);
  assert.equal(ensayo.archivo, "fotos/01-ensayo-bien.jpg");
  assert.equal(ensayo.tipo, "trabajo");
  assert.equal(ensayo.esperado, "Cumplió");
  assert.match(ensayo.nota_para_tomar_la_foto, /mano/);
  const ids = new Set(casos.map((caso) => caso.id));
  const archivos = new Set(casos.map((caso) => caso.archivo));
  assert.equal(ids.size, casos.length);
  assert.equal(archivos.size, casos.length);
  for (const caso of casos) assert.ok(readme.includes(caso.archivo), caso.archivo);
  assert.throws(() => rutaDeFoto("fotos/../casos.json"), /no permitido/);
});

test("si faltan claves, el mensaje nombra la variable y no el valor", () => {
  const secreto = "secreto-no-imprimir";
  const faltan = clavesFaltantes({ GROQ_API_KEY: secreto, GEMINI_API_KEY: "", LAYA_URL: "  " });
  assert.deepEqual(faltan, ["GEMINI_API_KEY", "LAYA_URL"]);
  const texto = mensajeClaves(faltan);
  assert.match(texto, /GEMINI_API_KEY/);
  assert.match(texto, /LAYA_URL/);
  assert.equal(texto.includes(secreto), false);
  assert.equal(redactarExamen(`uso ${secreto}`, [secreto]).includes(secreto), false);
});

test("un caso simulado pasa por revisar y la banda esperada cuenta como acierto", async () => {
  const casos = leerCasos(JSON.parse(readFileSync(`${CARPETA_EXAMEN}/casos.json`, "utf8")) as unknown);
  const ensayo = casos.find((caso) => caso.id === "ensayo-escrito-mano");
  assert.ok(ensayo);
  const informe = await correrExamen({
    casos: [ensayo, casoFaltante()],
    leerFoto: (archivo) => (archivo === ensayo.archivo ? FOTO : null),
    contexto: {
      claveGroq: "simulada",
      claveGemini: "simulada",
      layaUrl: "https://laya.simulada.invalid",
      fetchImpl: simular(),
    },
    modeloVision: "simulado",
    ahora: new Date("2026-10-07T00:00:00.000Z"),
  });
  assert.equal(informe.omitidos.length, 1);
  assert.equal(informe.omitidos[0]?.id, "foto-que-falta");
  assert.equal(informe.casos.length, 1);
  const fila = informe.casos[0];
  assert.ok(fila);
  assert.equal(fila.esperado, "Cumplió");
  assert.equal(fila.obtenido, "Cumplió");
  assert.equal(fila.acierto, true);
  assert.equal(typeof fila.nota, "number");
  assert.ok((fila.nota ?? 0) >= 80);
  assert.ok(fila.etiquetas.includes("matches"));
  assert.equal(informe.aciertos, 1);
  assert.equal(informe.porcentaje, 100);
  const tabla = textoInforme(informe);
  assert.match(tabla, /ensayo-escrito-mano/);
  assert.match(tabla, /Cumplió/);
  assert.match(tabla, /sí\s+matches/);
  assert.match(tabla, /Aciertos: 1 de 1 \(100%\)/);
  assert.match(tabla, /Sin foto: 1/);
});

function casoFaltante(): CasoExamen {
  return {
    id: "foto-que-falta",
    archivo: "fotos/99-no-esta.jpg",
    tipo: "trabajo",
    condicion: "Una foto que no está en la carpeta.",
    esperado: "Insuficiente",
    nota_para_tomar_la_foto: "No guardes este archivo.",
  };
}

function simular(): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("api.groq.com")) {
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(QWEN) } }] });
    }
    const cuerpo = cuerpoDe(init?.body);
    const ids = Object.keys(cuerpo?.questions ?? {});
    if (ids.length === 1 && ids[0] === "c1") return Response.json({ answers: { c1: { choice: "trabajo" } } });
    const answers: Record<string, unknown> = {};
    for (const id of ids) {
      const valor = RESPUESTAS[id];
      if (valor !== undefined) answers[id] = nodoLaya(valor);
    }
    return Response.json({ answers });
  };
}

function nodoLaya(valor: string | boolean | number): Record<string, unknown> {
  if (typeof valor === "string") return { choice: valor };
  if (typeof valor === "boolean") return { noul: valor };
  return { score: valor };
}

function cuerpoDe(cuerpo: BodyInit | null | undefined): { questions?: Record<string, unknown> } | null {
  if (typeof cuerpo !== "string") return null;
  try {
    const json: unknown = JSON.parse(cuerpo);
    return json && typeof json === "object" && !Array.isArray(json) ? (json as { questions?: Record<string, unknown> }) : null;
  } catch {
    return null;
  }
}
