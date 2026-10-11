import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { TareaFila } from "@/lib/db/tipos";
import { textoFalta } from "./falta";
import { etiquetasDesdeVeredicto } from "./mostrar-razones";
import { presentarEtiqueta } from "./notas-idioma";
import type { EtiquetaNota } from "./razones";
import { revisar, type ContextoRevision } from "./revisar";
import { separarDescripcion, unirDescripcion } from "./snapshot-razones";

/**
 * Regression for Aang's prod run of #300 (event 9dde46c4, files r7_*), with the four Mile switches on as in
 * Vercel prod: HYTO_MILE_FALTANTES_GROQ, HYTO_MILE_OTRA_CON_GROQ, HYTO_MILE_TIPO_POR_TAREA, HYTO_MILE_PREGUNTAS_EVENTO.
 * Groq and Laya are replayed with the readings and answers stored in prod (fixtures/r7/prod-veredictos.json).
 */

const DIR = join(__dirname, "fixtures", "r7");
const archivo = (nombre: string) => new Uint8Array(readFileSync(join(DIR, nombre)));
const PROD = JSON.parse(readFileSync(join(DIR, "prod-veredictos.json"), "utf8")) as Record<
  string,
  { score: string; veredicto: string; choice: string; texto_scout: string; monto: string | null; fecha: string | null }
>;

const SWITCHES = {
  HYTO_MILE_FALTANTES_GROQ: "on",
  HYTO_MILE_OTRA_CON_GROQ: "on",
  HYTO_MILE_TIPO_POR_TAREA: "on",
  HYTO_MILE_PREGUNTAS_EVENTO: "on",
} as const;

async function conSwitches<T>(fn: () => Promise<T>): Promise<T> {
  const antes = Object.fromEntries(Object.keys(SWITCHES).map((clave) => [clave, process.env[clave]]));
  Object.assign(process.env, SWITCHES);
  const error = console.error;
  console.error = () => undefined;
  try {
    return await fn();
  } finally {
    console.error = error;
    for (const [clave, valor] of Object.entries(antes)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  }
}

const MESA = "Mesa armada en la entrada con mantel, cartel de bienvenida y hoja de registro";
const LISTA = "Lista con los nombres y hora de llegada de los asistentes";

function tarea(tipo: "trabajo" | "reembolso", condicion: string, tope: string | null = null): TareaFila {
  return {
    id: `r7-${tipo}`,
    proyectoId: "9dde46c4-8bd7-4b78-a20b-193656a74dd2",
    titulo: "r7",
    tipo,
    monto: tipo === "reembolso" ? "4" : "5",
    tope,
    condicion,
    miembroId: "",
    walletCobro: "",
    estado: "en revisión",
    hashPago: null,
    contratoEscrow: null,
    credencialUrl: null,
    prioridad: "normal",
    dificultad: null,
  } as TareaFila;
}

/** The structured reading Groq returned in prod, back in the wire format (snake case). */
function lecturaDeProd(titulo: string): Record<string, unknown> {
  const crudo = PROD[titulo]!.texto_scout;
  const json = JSON.parse(crudo.slice(crudo.indexOf("@@hyto-lectura@@") + "@@hyto-lectura@@".length).trim()) as Record<string, unknown>;
  const texto = crudo.slice(0, crudo.indexOf("\n@@hyto-razones@@"));
  return { ...json, fecha: json.fecha_impresa ?? json.fecha, texto_completo: texto };
}

type Respuestas = Record<string, unknown>;

/** Laya's prod answers, as the snapshot stored them. */
function respuestasDeProd(titulo: string): { clase: string; respuestas: Respuestas } {
  const crudo = PROD[titulo]!.texto_scout;
  const linea = crudo.split("@@hyto-razones@@\n")[1]!.split("\n")[0]!;
  const mapa = Object.fromEntries(linea.split("&").map((parte) => parte.split("=") as [string, string]));
  const respuestas: Respuestas = {};
  for (const [id, valor] of Object.entries(mapa)) {
    if (id === "c" || id === "cerca") continue;
    if (["v2", "t10", "f4", "g5"].includes(id)) {
      respuestas[id] = { probabilities: { "0": valor === "0" ? 0.8 : 0.1, "1": valor === "1" ? 0.8 : 0.1, "2": valor === "2" ? 0.8 : 0.1 } };
    } else if (valor === "0" || valor === "1") {
      respuestas[id] = { noul: valor === "1" };
    } else {
      respuestas[id] = { choice: valor };
    }
  }
  return { clase: mapa.c!, respuestas };
}

const FACTURA_BUENA: Respuestas = respuestasDeProd("Factura foto").respuestas;

function contexto(opciones: {
  groq?: Record<string, unknown>;
  c1: string;
  trabajo?: Respuestas;
  factura?: Respuestas;
  laya?: string[][];
}): ContextoRevision {
  return {
    claveGroq: "clave-groq",
    claveGemini: null,
    layaUrl: "https://laya.example",
    produccion: true,
    mileActivo: true,
    idioma: "es",
    fetchImpl: async (input, init) => {
      const url = String(input);
      if (url.includes("groq.com")) {
        assert.ok(opciones.groq, "this evidence must not reach vision");
        return Response.json({ choices: [{ message: { content: JSON.stringify(opciones.groq) } }] });
      }
      const cuerpo = JSON.parse(String(init?.body)) as { questions?: Record<string, unknown> };
      const ids = Object.keys(cuerpo.questions ?? {});
      opciones.laya?.push(ids);
      if (ids.includes("c1") && !ids.includes("v1") && !ids.includes("f1")) return Response.json({ answers: { c1: { choice: opciones.c1 } } });
      if (ids.includes("v1")) return Response.json({ answers: opciones.trabajo ?? {} });
      return Response.json({ answers: opciones.factura ?? FACTURA_BUENA });
    },
  };
}

function etiquetas(resultado: Awaited<ReturnType<typeof revisar>>, entrada: { tipo: "trabajo" | "reembolso"; condicion: string; tope?: string | null }) {
  return etiquetasDesdeVeredicto({
    textoScout: unirDescripcion(resultado.texto, resultado.detalle, resultado.lectura),
    origen: resultado.origen,
    monto: resultado.monto,
    fecha: resultado.fecha,
    tope: entrada.tope ?? null,
    tipo: entrada.tipo,
    condicion: entrada.condicion,
  });
}

const ids = (lista: readonly EtiquetaNota[]) => lista.map((etiqueta) => etiqueta.id);
const es = (lista: readonly EtiquetaNota[]) => lista.map((etiqueta) => presentarEtiqueta(etiqueta, "es"));

test("r7 caso 1: la mesa completa (Groq: coincide sí, nada falta) llega a «Cumplió» aunque Laya dudó (prod: 57%, «Trabajo sin terminar»)", async () => {
  const titulo = "Mesa de bienvenida completa";
  assert.equal(PROD[titulo]!.score, "57");
  const { respuestas } = respuestasDeProd(titulo);
  const resultado = await conSwitches(() =>
    revisar(tarea("trabajo", MESA), { tipo: "image/jpeg", bytes: archivo("r7_mesa_good.jpg") }, contexto({ groq: lecturaDeProd(titulo), c1: "trabajo", trabajo: respuestas })),
  );
  assert.equal(resultado.veredicto, "cumplió");
  assert.ok((resultado.nota ?? 0) >= 80, `nota ${resultado.nota}`);
  const lista = etiquetas(resultado, { tipo: "trabajo", condicion: MESA });
  assert.equal(ids(lista).includes("unfinished"), false);
  assert.equal(ids(lista).includes("cap_no_coincide"), false);
  assert.equal(textoFalta(lista, "es"), null);
});

test("r7 caso 2: la mesa incompleta dice qué falta, en español, y no «Parece una foto de la persona»", async () => {
  const titulo = "Mesa de bienvenida (incompleta)";
  const resultado = await conSwitches(() =>
    revisar(tarea("trabajo", MESA), { tipo: "image/jpeg", bytes: archivo("r7_mesa_incomplete.jpg") }, contexto({
      groq: lecturaDeProd(titulo),
      c1: "otra",
      trabajo: { ...respuestasDeProd("Mesa de bienvenida completa").respuestas, v1: { choice: "es_otra_cosa" }, t6: { choice: "sin_empezar" } },
    })),
  );
  assert.equal(resultado.veredicto, "insuficiente");
  const lista = es(etiquetas(resultado, { tipo: "trabajo", condicion: MESA }));
  assert.equal(ids(lista).includes("selfie_or_empty"), false);
  const otra = lista.find((etiqueta) => etiqueta.id === "cap_otra");
  assert.ok(otra);
  assert.equal(otra.texto, "Problema grave: no muestra lo que pide la tarea");
  assert.equal(otra.explicacion, "Falta: mantel sobre la mesa; cartel de bienvenida; hoja de registro.");
  assert.equal(textoFalta(etiquetas(resultado, { tipo: "trabajo", condicion: MESA }), "es"), "Falta: mantel sobre la mesa; cartel de bienvenida; hoja de registro.");
});

test("r7 caso 2 sin lista de Groq: los elementos salen de la tarea (mantel, cartel, hoja de registro)", () => {
  const titulo = "Mesa de bienvenida (incompleta)";
  const guardado = PROD[titulo]!.texto_scout.replace(/"faltantes":\[[^\]]*\]/, '"faltantes":[]');
  const lista = etiquetasDesdeVeredicto({ textoScout: guardado, origen: "scout", monto: null, fecha: null, tope: null, tipo: "trabajo", condicion: MESA });
  const texto = textoFalta(lista, "es") ?? "";
  assert.match(texto, /mantel/);
  assert.match(texto, /cartel de bienvenida/);
  assert.match(texto, /hoja de registro/);
});

test("r7 caso 3: la lista de asistentes en TXT, completa y terminada, llega a «Cumplió» (prod: 74%)", async () => {
  const titulo = "Lista de asistentes";
  assert.equal(PROD[titulo]!.score, "74");
  const laya: string[][] = [];
  const resultado = await conSwitches(() =>
    revisar(tarea("trabajo", LISTA), { tipo: "text/plain", bytes: archivo("r7_lista.txt") }, contexto({ c1: "trabajo", trabajo: respuestasDeProd(titulo).respuestas, laya })),
  );
  assert.equal(resultado.lectura?.tipo, "trabajo", "an attendance list is the work, not a receipt");
  assert.equal(resultado.veredicto, "cumplió");
  assert.ok((resultado.nota ?? 0) >= 80, `nota ${resultado.nota}`);
  const lista = es(etiquetas(resultado, { tipo: "trabajo", condicion: LISTA }));
  assert.ok(lista.some((etiqueta) => etiqueta.texto === "Coincide con lo pedido"));
  assert.ok(lista.some((etiqueta) => etiqueta.texto === "Terminado"));
  assert.equal(textoFalta(lista, "es"), null);
});

test("r7 caso 4: la foto de la factura sigue en 88% «Completado»", async () => {
  const titulo = "Factura foto";
  const resultado = await conSwitches(() =>
    revisar(tarea("reembolso", "", "4"), { tipo: "image/jpeg", bytes: archivo("r7_receipt_photo.jpg") }, contexto({ groq: lecturaDeProd(titulo), c1: "factura" })),
  );
  assert.equal(resultado.nota, 88);
  assert.equal(resultado.veredicto, "cumplió");
  assert.equal(resultado.choice, "factura");
});

test("r7 caso 5: la factura en PDF con texto se califica como factura, sin señales de trabajo terminado (prod: 65%, «Trabajo sin terminar»)", async () => {
  const titulo = "Factura PDF texto";
  assert.equal(PROD[titulo]!.choice, "trabajo");
  const laya: string[][] = [];
  const resultado = await conSwitches(() =>
    revisar(tarea("reembolso", "", "4"), { tipo: "application/pdf", bytes: archivo("r7_receipt_text.pdf") }, contexto({
      c1: "otra",
      trabajo: respuestasDeProd(titulo).respuestas,
      laya,
    })),
  );
  assert.equal(resultado.choice, "factura");
  assert.equal(laya.some((preguntas) => preguntas.includes("t6") || preguntas.includes("t9")), false, "no work questions for an invoice");
  assert.equal(resultado.monto, "3.20");
  assert.equal(resultado.veredicto, "cumplió");
  const lista = etiquetas(resultado, { tipo: "reembolso", condicion: "", tope: "4" });
  assert.equal(ids(lista).includes("unfinished"), false);
  assert.equal(ids(lista).includes("finished"), false);
});

test("r7 caso 6: el PDF escaneado de la factura sigue en 88% por visión", async () => {
  const titulo = "Factura PDF escaneado";
  const resultado = await conSwitches(() =>
    revisar(tarea("reembolso", "", "4"), { tipo: "application/pdf", bytes: archivo("r7_receipt_scan.pdf") }, contexto({ groq: lecturaDeProd(titulo), c1: "factura" })),
  );
  assert.equal(resultado.nota, 88);
  assert.equal(resultado.veredicto, "cumplió");
});

test("r7 caso 7: la factura sin fecha dice «Falta la fecha de la factura» y no «el gasto no es razonable» (prod: 73%)", async () => {
  const titulo = "Factura sin fecha";
  const { respuestas } = respuestasDeProd(titulo);
  assert.deepEqual(respuestas.g2, { noul: false });
  const resultado = await conSwitches(() =>
    revisar(tarea("reembolso", "", "4"), { tipo: "image/jpeg", bytes: archivo("r7_receipt_nodate.jpg") }, contexto({ groq: lecturaDeProd(titulo), c1: "factura", factura: respuestas })),
  );
  assert.equal(resultado.veredicto, "parcial", "without a date the receipt cannot be Completed");
  assert.equal(resultado.nota, 79);
  const lista = es(etiquetas(resultado, { tipo: "reembolso", condicion: "", tope: "4" }));
  assert.equal(ids(lista).includes("cap_no_razonable"), false);
  assert.ok(lista.some((etiqueta) => etiqueta.texto === "Falta la fecha de la factura"));
  assert.equal(textoFalta(etiquetas(resultado, { tipo: "reembolso", condicion: "", tope: "4" }), "es"), "Falta: la fecha de la factura.");
});

test("r7 en lectura: los veredictos ya guardados en prod muestran etiquetas coherentes", () => {
  const leer = (titulo: string, tipo: "trabajo" | "reembolso", condicion: string, tope: string | null = null) =>
    es(etiquetasDesdeVeredicto({ textoScout: PROD[titulo]!.texto_scout, origen: "scout", monto: PROD[titulo]!.monto, fecha: PROD[titulo]!.fecha, tope, tipo, condicion }));
  const completa = leer("Mesa de bienvenida completa", "trabajo", MESA);
  assert.equal(ids(completa).includes("unfinished"), false, "Groq saw everything; Laya's 'unfinished' is not shown");
  const incompleta = leer("Mesa de bienvenida (incompleta)", "trabajo", MESA);
  assert.equal(ids(incompleta).includes("selfie_or_empty"), false);
  assert.match(incompleta.find((etiqueta) => etiqueta.id === "cap_otra")?.explicacion ?? "", /^Falta: mantel sobre la mesa; cartel de bienvenida; hoja de registro\.$/);
  const sinFecha = leer("Factura sin fecha", "reembolso", "", "4");
  assert.equal(ids(sinFecha).includes("cap_no_razonable"), false);
  assert.ok(sinFecha.some((etiqueta) => etiqueta.texto === "Falta la fecha de la factura"));
  assert.ok(separarDescripcion(PROD["Factura sin fecha"]!.texto_scout).lectura);
});
