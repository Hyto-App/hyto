import assert from "node:assert/strict";
import test from "node:test";
import type { TareaFila } from "@/lib/db/tipos";
import { cerrar, type Senales } from "./armar";
import { aplicarV4DeFaltantes, bloqueFaltantesGroq, faltaAlgo, mileFaltantesGroqActivo, type EntornoFaltantesGroq } from "./faltantes-groq";
import { senalesDeFactura, senalesDeTrabajo, type RespuestasFactura, type RespuestasTrabajo } from "./laya";
import { leerLectura, type LecturaEvidencia } from "./lectura";
import { etiquetasDe } from "./razones";
import { revisar } from "./revisar";
import { formatoRespuestaVision, pedidoVision } from "./scout";
import { leerSnapshot, escribirSnapshot } from "./snapshot-razones";

const APAGADO: EntornoFaltantesGroq = { HYTO_MILE_FALTANTES_GROQ: "off" };
const ENCENDIDO: EntornoFaltantesGroq = { HYTO_MILE_FALTANTES_GROQ: "on" };
const PEDIDO = "Banner visible and the table set up";

test("el interruptor solo se enciende con on", () => {
  assert.equal(mileFaltantesGroqActivo({}), false);
  assert.equal(mileFaltantesGroqActivo({ HYTO_MILE_FALTANTES_GROQ: undefined }), false);
  assert.equal(mileFaltantesGroqActivo({ HYTO_MILE_FALTANTES_GROQ: "" }), false);
  assert.equal(mileFaltantesGroqActivo({ HYTO_MILE_FALTANTES_GROQ: "off" }), false);
  assert.equal(mileFaltantesGroqActivo({ HYTO_MILE_FALTANTES_GROQ: "1" }), false);
  assert.equal(mileFaltantesGroqActivo({ HYTO_MILE_FALTANTES_GROQ: "true" }), false);
  assert.equal(mileFaltantesGroqActivo({ HYTO_MILE_FALTANTES_GROQ: "yes" }), false);
  assert.equal(mileFaltantesGroqActivo({ HYTO_MILE_FALTANTES_GROQ: "on" }), true);
  assert.equal(mileFaltantesGroqActivo({ HYTO_MILE_FALTANTES_GROQ: "ON" }), true);
  assert.equal(mileFaltantesGroqActivo({ HYTO_MILE_FALTANTES_GROQ: " on " }), true);
  assert.equal(faltaAlgo([]), false);
  assert.equal(faltaAlgo(["  "]), false);
  assert.equal(faltaAlgo(null), false);
  assert.equal(faltaAlgo(["the entrance"]), true);
});

const PEDIDO_VISION = { condicion: "Photo of the Cafe Cursor sign", tipoTarea: "trabajo" as const };

test("apagado, el pedido de visión no cambia", () => {
  const base = pedidoVision(PEDIDO_VISION, {});
  const off = pedidoVision(PEDIDO_VISION, APAGADO);
  const otro = pedidoVision(PEDIDO_VISION, { HYTO_MILE_FALTANTES_GROQ: "true" });
  assert.equal(off, base);
  assert.equal(otro, base);
  assert.equal(bloqueFaltantesGroq("en", APAGADO), "");
  assert.equal(base.includes("Reading rules for HYTO_MILE_FALTANTES_GROQ"), false);
  assert.equal(base.includes("bokeh"), false);
  assert.equal(base.includes("exactly as they appear"), false);
  assert.match(base, /legible: true if the photo is sharp and clear enough to judge\. false if it is blurry, too dark, or cut off\./);
  assert.match(base, /faltantes: a list of short phrases in English only, never Spanish, naming what the organizer asked for that the photo does not show\. An empty list if nothing is missing\./);
  const enEspanol = pedidoVision({ ...PEDIDO_VISION, idioma: "es" }, APAGADO);
  assert.equal(enEspanol.includes("Reading rules for HYTO_MILE_FALTANTES_GROQ"), false);
  assert.match(enEspanol, /faltantes: a list of short phrases in Spanish only/);
});

test("encendido, el pedido pide faltantes de la condición, ignora el bokeh y copia la marca", () => {
  const apagado = pedidoVision(PEDIDO_VISION, APAGADO);
  const encendido = pedidoVision(PEDIDO_VISION, ENCENDIDO);
  assert.equal(bloqueFaltantesGroq("en", ENCENDIDO).startsWith("Reading rules for HYTO_MILE_FALTANTES_GROQ:"), true);
  for (const linea of apagado.split("\n")) assert.equal(encendido.includes(linea), true, linea);
  assert.match(encendido, /list only what the organizer's request asks for/);
  assert.match(encendido, /Do not list as missing anything the description already says is visible/);
  assert.match(encendido, /intentionally blurred background \(bokeh\)/);
  assert.match(encendido, /Copy brand names, logos, and other printed words exactly as they appear/);
  assert.match(encendido, /Keep each faltantes phrase in English only/);
  const legible = encendido.indexOf("legible: true if the photo is sharp");
  const bloque = encendido.indexOf("Reading rules for HYTO_MILE_FALTANTES_GROQ:");
  const faltantes = encendido.indexOf("faltantes: a list of short phrases");
  assert.equal(legible >= 0 && bloque > legible && faltantes > bloque, true);
  const enEspanol = pedidoVision({ ...PEDIDO_VISION, idioma: "es" }, ENCENDIDO);
  const apagadoEs = pedidoVision({ ...PEDIDO_VISION, idioma: "es" }, APAGADO);
  for (const linea of apagadoEs.split("\n")) assert.equal(enEspanol.includes(linea), true, linea);
  assert.match(enEspanol, /Keep each faltantes phrase in Spanish only, and in formal usted/);
  assert.match(enEspanol, /bokeh/);
  assert.equal(enEspanol.includes("Keep each faltantes phrase in English only"), false);
});

test("ambos interruptores encendidos, el pedido y el esquema llevan faltantes y coincide", () => {
  const ambos = { HYTO_MILE_FALTANTES_GROQ: "on", HYTO_MILE_OTRA_CON_GROQ: "on" };
  const prompt = pedidoVision(PEDIDO_VISION, ambos);
  assert.match(prompt, /Reading rules for HYTO_MILE_FALTANTES_GROQ:/);
  assert.match(prompt, /coincide is required on every reply/);
  assert.match(prompt, /faltantes, coincide/);
  const legible = prompt.indexOf("legible: true if the photo is sharp");
  const bloque = prompt.indexOf("Reading rules for HYTO_MILE_FALTANTES_GROQ:");
  const coincide = prompt.indexOf("coincide is required on every reply");
  assert.equal(legible >= 0 && coincide > 0 && bloque > legible, true);
  assert.equal(pedidoVision(PEDIDO_VISION, ENCENDIDO).includes("coincide is required"), false);

  const formato = formatoRespuestaVision("qwen/qwen3.8-27b", ambos);
  assert.equal(formato.type, "json_schema");
  if (formato.type !== "json_schema") return;
  const schema = formato.json_schema.schema;
  const serializado = JSON.parse(JSON.stringify(schema)) as typeof schema;
  assert.equal(serializado.type, "object");
  assert.equal(serializado.additionalProperties, false);
  const propiedades = serializado.properties as Record<string, { type?: string; enum?: string[]; items?: { type?: string } }>;
  assert.deepEqual(propiedades.faltantes, { type: "array", items: { type: "string" } });
  assert.deepEqual(propiedades.coincide, { type: "string", enum: ["si", "parcial", "no"] });
  const required = serializado.required as string[];
  assert.deepEqual([...required].sort(), Object.keys(propiedades).sort());
  assert.ok(required.includes("faltantes"));
  assert.ok(required.includes("coincide"));
  assert.deepEqual(formatoRespuestaVision("qwen/qwen3.8-27b", ENCENDIDO), { type: "json_object" });
});

test("apagado, la respuesta v4 de Laya no cambia aunque Groq no vea faltantes", () => {
  const senales = trabajo(true);
  const salida = aplicarV4DeFaltantes(senales, lectura([]), PEDIDO, APAGADO);
  assert.equal(salida, senales);
  assert.equal(salida.score, "90");
  assert.equal(leerSnapshot(salida.detalle ?? "")?.trabajo?.v4, true);
});

test("apagado por omisión, una lista vacía no devuelve los 10 puntos", () => {
  const senales = trabajo(true);
  const salida = aplicarV4DeFaltantes(senales, lectura([]), PEDIDO, {});
  assert.equal(salida, senales);
  assert.equal(salida.score, "90");
});

test("encendido, una lista vacía de Groq no penaliza el v4 de Laya", () => {
  const senales = trabajo(true);
  const salida = aplicarV4DeFaltantes(senales, lectura([]), PEDIDO, ENCENDIDO);
  assert.equal(salida.score, "100");
  assert.equal(salida.noul, true);
  assert.equal(salida.choice, "trabajo");
  assert.equal(leerSnapshot(salida.detalle ?? "")?.trabajo?.v4, false);
  const dudoso = empaquetar({ ...perfecto(), v1: "no_se_puede_saber", v4: true }, PEDIDO);
  assert.equal(dudoso.score, "80");
  const sinFalta = aplicarV4DeFaltantes(dudoso, lectura([]), PEDIDO, ENCENDIDO);
  assert.equal(sinFalta.score, "90");
  const etiquetas = etiquetasDe({
    clase: "trabajo",
    trabajo: leerSnapshot(sinFalta.detalle ?? "")?.trabajo ?? null,
    factura: null,
    descripcion: "The banner and the table are visible.",
    cerca: [],
    monto: null,
    fecha: null,
    tope: null,
    condicion: PEDIDO,
  });
  assert.equal(etiquetas.some((etiqueta) => etiqueta.id === "part_missing"), false);
  const cerrado = cerrar("trabajo", null, { texto: "The banner and the table are visible.", monto: null, fecha: null }, salida, "scout");
  assert.equal(cerrado?.nota, 100);
  assert.equal(cerrado?.veredicto, "cumplió");
});

test("encendido, lo que Groq listó sigue restando aunque Laya haya dicho que no", () => {
  const senales = trabajo(false);
  assert.equal(senales.score, "100");
  const salida = aplicarV4DeFaltantes(senales, lectura(["the entrance"]), PEDIDO, ENCENDIDO);
  assert.equal(salida.score, "90");
  assert.equal(salida.noul, false);
  assert.equal(leerSnapshot(salida.detalle ?? "")?.trabajo?.v4, true);
  const dudoso = empaquetar({ ...perfecto(), v1: "no_se_puede_saber", v4: false }, PEDIDO);
  const marcado = aplicarV4DeFaltantes(dudoso, lectura(["the entrance"]), PEDIDO, ENCENDIDO);
  assert.equal(marcado.score, "80");
  const etiquetas = etiquetasDe({
    clase: "trabajo",
    trabajo: leerSnapshot(marcado.detalle ?? "")?.trabajo ?? null,
    factura: null,
    descripcion: "The banner is visible.",
    cerca: [],
    monto: null,
    fecha: null,
    tope: null,
    condicion: PEDIDO,
  });
  assert.equal(etiquetas.some((etiqueta) => etiqueta.preguntas.includes("v4")), true);
});

test("encendido, si Laya y Groq ya coinciden la nota no se mueve", () => {
  const falta = trabajo(true);
  const igual = aplicarV4DeFaltantes(falta, lectura(["the table"]), PEDIDO, ENCENDIDO);
  assert.equal(igual, falta);
  assert.equal(igual.score, "90");
  const nada = trabajo(false);
  const tambien = aplicarV4DeFaltantes(nada, lectura([]), PEDIDO, ENCENDIDO);
  assert.equal(tambien, nada);
  assert.equal(tambien.score, "100");
});

test("encendido, sin lectura estructurada se queda la respuesta de Laya", () => {
  const senales = trabajo(true);
  const salida = aplicarV4DeFaltantes(senales, null, PEDIDO, ENCENDIDO);
  assert.equal(salida, senales);
  assert.equal(salida.score, "90");
});

test("encendido, una factura y un cero forzado no usan la lista de Groq", () => {
  const factura = senalesFactura();
  assert.equal(aplicarV4DeFaltantes(factura, lectura([]), PEDIDO, ENCENDIDO), factura);
  const forzada: Senales = { ...trabajo(true), score: "0" };
  const salida = aplicarV4DeFaltantes(forzada, lectura([]), PEDIDO, ENCENDIDO);
  assert.equal(salida, forzada);
  assert.equal(salida.score, "0");
  assert.equal(leerSnapshot(salida.detalle ?? "")?.trabajo?.v4, true);
});

test("encendido, el ajuste de v4 conserva el lugar pedido y los motivos", () => {
  const condicion = "Set the table at the entrance";
  const respuestas = { ...perfecto(), v4: true, t8: false };
  const senales = empaquetar(respuestas, condicion);
  assert.equal(senales.score, "78");
  assert.deepEqual(senales.motivos, ["no_coincide"]);
  const salida = aplicarV4DeFaltantes(senales, lectura([]), condicion, ENCENDIDO);
  assert.equal(salida.score, "88");
  assert.deepEqual(salida.motivos, ["no_coincide"]);
  const detalle = leerSnapshot(salida.detalle ?? "");
  assert.equal(detalle?.trabajo?.v4, false);
  assert.equal(detalle?.trabajo?.t8, false);
  assert.equal(detalle?.cumpleRegla, false);
});

test("revisar usa el interruptor: apagado resta 10, encendido no, si Groq no listó faltantes", async () => {
  const previo = process.env.HYTO_MILE_FALTANTES_GROQ;
  try {
    delete process.env.HYTO_MILE_FALTANTES_GROQ;
    const apagado = await revisarFoto([]);
    assert.equal(apagado.nota, 90);
    assert.equal(apagado.veredicto, "cumplió");
    assert.equal(leerSnapshot(apagado.detalle ?? "")?.trabajo?.v4, true);

    process.env.HYTO_MILE_FALTANTES_GROQ = "on";
    const encendido = await revisarFoto([]);
    assert.equal(encendido.nota, 100);
    assert.equal(encendido.veredicto, "cumplió");
    assert.equal(leerSnapshot(encendido.detalle ?? "")?.trabajo?.v4, false);

    process.env.HYTO_MILE_FALTANTES_GROQ = "true";
    const otroValor = await revisarFoto([]);
    assert.equal(otroValor.nota, 90);
    assert.equal(leerSnapshot(otroValor.detalle ?? "")?.trabajo?.v4, true);

    process.env.HYTO_MILE_FALTANTES_GROQ = "on";
    const conFaltantes = await revisarFoto(["the entrance"]);
    assert.equal(conFaltantes.nota, 90);
    assert.equal(leerSnapshot(conFaltantes.detalle ?? "")?.trabajo?.v4, true);
  } finally {
    if (previo === undefined) delete process.env.HYTO_MILE_FALTANTES_GROQ;
    else process.env.HYTO_MILE_FALTANTES_GROQ = previo;
  }
});

function perfecto(): RespuestasTrabajo {
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

function trabajo(v4: boolean, condicion = PEDIDO): Senales {
  return empaquetar({ ...perfecto(), v4 }, condicion);
}

function empaquetar(respuestas: RespuestasTrabajo, condicion: string): Senales {
  return {
    ...senalesDeTrabajo({ ...respuestas, v1: respuestas.v1 }, condicion),
    motivos: respuestas.t8 ? senalesDeTrabajo(respuestas, condicion).motivos : ["no_coincide"],
    detalle: escribirSnapshot({
      clase: "trabajo",
      trabajo: respuestas,
      factura: null,
      cerca: [],
      cumpleRegla: false,
    }),
  };
}

function senalesFactura(): Senales {
  const factura: RespuestasFactura = {
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
  return {
    ...senalesDeFactura(factura),
    detalle: escribirSnapshot({ clase: "factura", trabajo: null, factura, cerca: [] }),
  };
}

function lectura(faltantes: string[]): LecturaEvidencia {
  const leida = leerLectura({
    tipo: "trabajo",
    pais: null,
    moneda: null,
    monto_original: null,
    monto_usd: null,
    fecha: null,
    comercio: null,
    articulos: ["banner"],
    texto_completo: "The banner is standing next to the table. The photo shows what the organizer asked for.",
    legible: true,
    faltantes,
  });
  assert.ok(leida);
  return leida;
}

const TAREA: TareaFila = {
  id: "stand",
  proyectoId: "zeek",
  titulo: "Set up the booth",
  tipo: "trabajo",
  monto: "20",
  tope: null,
  condicion: PEDIDO,
  miembroId: "voluntario-1",
  walletCobro: "",
  estado: "en revisión",
  hashPago: null,
  contratoEscrow: null,
  credencialUrl: null,
  prioridad: "normal",
  dificultad: null,
};

const FOTO = { tipo: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) };

function vision(faltantes: string[]) {
  return {
    tipo: "trabajo",
    pais: null,
    moneda: null,
    monto_original: null,
    monto_usd: null,
    fecha: null,
    comercio: null,
    articulos: ["banner", "table"],
    texto_completo: "The banner is standing next to the table. The setup looks finished and matches the request.",
    legible: true,
    faltantes,
  };
}

async function revisarFoto(faltantes: string[]) {
  return revisar(TAREA, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    fetchImpl: async (input, init) => {
      if (String(input).includes("groq")) {
        return Response.json({ choices: [{ message: { content: JSON.stringify(vision(faltantes)) } }] });
      }
      const cuerpo = JSON.parse(String(init?.body)) as { questions?: Record<string, unknown> };
      const preguntas = cuerpo.questions ?? {};
      if ("c1" in preguntas && !("v1" in preguntas)) return Response.json({ answers: { c1: { choice: "trabajo" } } });
      return Response.json({
        answers: {
          lugar: { choice: "stand_o_mesa" },
          v1: { choice: "es_lo_pedido" },
          v2: { score: 2 },
          v3: { noul: true },
          v4: { noul: true },
          t5: { choice: "armar_o_montar" },
          t6: { choice: "terminado" },
          t7: { noul: true },
          t8: { noul: true },
          t9: { noul: false },
          t10: { score: 2 },
        },
      });
    },
  });
}
