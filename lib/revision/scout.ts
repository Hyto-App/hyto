import { normalizarMonto } from "@/lib/admin/vista";
import { ajustarParaVision } from "@/lib/evidencia/vision";
import type { TipoTarea } from "@/lib/integrante/tipos";
import type { Descripcion } from "./armar";
import { bloqueContextoEvento, reglaDeEvento, type ContextoEvento } from "./contexto-evento";
import { bloqueOrganizacion } from "./organizacion";
import { bloqueFaltantesGroq, type EntornoFaltantesGroq } from "./faltantes-groq";
import { esCupo, falloDeExcepcion, falloHttp, FalloRevision } from "./fallo";
import { CLAVES_LECTURA, coincideMencionado, leerLectura } from "./lectura";
import { mileOtraConGroqActivo, type CoincideGroq, type EntornoOtraGroq } from "./otra-groq";

export const MODELO_VISION_DEFECTO = "qwen/qwen3.8-27b";

export function modeloVision(env: NodeJS.ProcessEnv = process.env): string {
  const pedido = env.GROQ_VISION_MODEL?.trim();
  return pedido || MODELO_VISION_DEFECTO;
}

/** Groq accepts reasoning_effort "none" only on Qwen 3 models, so any other model gets no reasoning parameters. */
export function parametrosRazonamiento(modelo: string): { reasoning_effort?: "none"; reasoning_format?: "hidden" } {
  return /^qwen\/qwen3/i.test(modelo.trim()) ? { reasoning_effort: "none", reasoning_format: "hidden" } : {};
}
const BASE = "https://api.groq.com/openai/v1";
/** The structured reply carries a long description, so 1024 tokens could cut the JSON. */
export const MAX_TOKENS = 2048;
/** One short follow-up that only asks for coincide. It does not send the photo again. */
const MAX_TOKENS_COINCIDE = 256;
const MAX_CONDICION = 600;

export type ContextoPedido = {
  /** What the organizer asked the photo to show. */
  condicion?: string | null;
  tipoTarea?: TipoTarea | null;
  idioma?: "en" | "es";
  /** Background about the event. Empty leaves the prompt as it was. */
  evento?: ContextoEvento | null;
  /** The community description. Empty, or the switch off, leaves the prompt as it was. */
  organizacion?: string | null;
};

/** Either Mile switch may be set. Each block stays empty unless its own value is exactly "on". */
export type EntornoPedidoVision = EntornoFaltantesGroq & EntornoOtraGroq;

/**
 * The prompt sent with the photo. The task condition is part of it, so the description answers the request.
 * HYTO_MILE_OTRA_CON_GROQ adds the coincide block. HYTO_MILE_FALTANTES_GROQ adds its own block after legible.
 * Each block is empty unless that switch is exactly "on".
 */
export function pedidoVision(contexto: ContextoPedido = {}, env: EntornoPedidoVision = process.env): string {
  const condicion = contexto.condicion?.replace(/\s+/g, " ").trim().slice(0, MAX_CONDICION) ?? "";
  const tarea =
    contexto.tipoTarea === "reembolso"
      ? "This is a reimbursement task, so the photo should be a receipt or an invoice."
      : contexto.tipoTarea === "trabajo"
        ? "This is a work task, so the photo should show the place, the people, the objects, the food, or the result the organizer asked for."
        : "";
  const espanol = contexto.idioma === "es";
  const tipoRegla = contexto.tipoTarea ?? "trabajo";
  const regla = reglaDeEvento(contexto.evento, tipoRegla);
  const claves = regla ? [...CLAVES_LECTURA, "cumple_reglas"] : [...CLAVES_LECTURA];
  if (mileOtraConGroqActivo(env)) claves.push("coincide");
  return [
    "You read a photo that a volunteer sent as evidence for a task.",
    condicion ? `The organizer asked for: "${condicion}".` : "",
    tarea,
    bloqueContextoEvento(contexto.evento, tipoRegla),
    bloqueOrganizacion(contexto.organizacion),
    "Describe only what is visible. Never invent a detail, an amount, a date, or a currency.",
    `Reply with JSON only, using exactly these keys: ${claves.join(", ")}.`,
    regla
      ? "cumple_reglas: true only when the photo meets every rule inside <event_context>. false when it breaks at least one, for example a receipt from a different kind of store than the rule allows. null only when the photo does not show enough to decide."
      : "",
    'tipo: "recibo" for a receipt, an invoice, or a payment screen. "trabajo" for a place, people, objects, food, or work the organizer asked to see. "otra" for anything else, such as a selfie or an unrelated image.',
    bloqueCoincideGroq(env),
    (espanol
      ? "texto_completo: a detailed description in Spanish only, never English or any other language, even when the request or the receipt is in English. If you address the reader, use formal usted, never tú or vos. 4 to 8 sentences. Say what is shown and where. Say what was done, whether it looks finished, and which tools, materials, or items are visible. Say how the photo relates to what the organizer asked for, and what is missing, unfinished, or not visible. For a receipt, include the merchant, the items, the total exactly as printed with its currency, and the date exactly as printed."
      : "texto_completo: a detailed description in English only, never Spanish or any other language, even when the request or the receipt is in Spanish. 4 to 8 sentences. Say what is shown and where. Say what was done, whether it looks finished, and which tools, materials, or items are visible. Say how the photo relates to what the organizer asked for, and what is missing, unfinished, or not visible. For a receipt, include the merchant, the items, the total exactly as printed with its currency, and the date exactly as printed."),
    "legible: true if the photo is sharp and clear enough to judge. false if it is blurry, too dark, or cut off.",
    // Separate from the coincide block (HYTO_MILE_OTRA_CON_GROQ). Empty when this switch is off.
    bloqueFaltantesGroq(espanol ? "es" : "en", env),
    "pais: the country as a two-letter ISO code, such as CR for Costa Rica, only if the photo shows it (an address, a phone code, a tax id, or the currency). Otherwise null.",
    "moneda: the ISO 4217 code of the total. ₡, ¢, colones, or CRC is CRC, Costa Rican colones. Use USD only when the receipt shows US$, USD, or dollars, or a $ total on a receipt from Costa Rica or the United States. If the currency is not shown, use null. Never guess USD.",
    "monto_original: the total exactly as printed, keeping its symbol and separators, such as ₡7.950,00 or 15.179,99. Costa Rican receipts often use a dot for thousands and a comma for decimals. Null if there is no total.",
    "monto_usd: the total in US dollars only when the receipt itself prints it in US dollars. Otherwise null. Do not convert colones or any other currency.",
    "fecha: the purchase date exactly as printed, such as 02/10/2026. Costa Rica writes the day first (DD/MM/YYYY). Null if there is no date.",
    "comercio: the store or business name, or null.",
    "articulos: a list of the items on the receipt, or of the main objects that prove the work. An empty list if there are none.",
    (espanol
      ? "faltantes: a list of short phrases in Spanish only, never English, and in formal usted if they address the reader, never tú or vos, naming what the organizer asked for that the photo does not show. An empty list if nothing is missing."
      : "faltantes: a list of short phrases in English only, never Spanish, naming what the organizer asked for that the photo does not show. An empty list if nothing is missing."),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Reads the structured reply. The older reply with only texto, monto, and fecha is still read the
 * old way: a dollar amount and a YYYY-MM-DD date, or null.
 */
export function leerDescripcion(texto: string, contexto: ContextoPedido = {}): Descripcion | null {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) return null;
  let json: unknown;
  try {
    json = JSON.parse(texto.slice(inicio, fin + 1));
  } catch {
    return null;
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const crudo = json as Record<string, unknown>;
  const lectura = leerLectura(crudo, { pedido: contexto.condicion ?? null });
  if (lectura) {
    return { texto: lectura.textoCompleto, monto: lectura.montoUsd, fecha: lectura.fecha, lectura };
  }
  const frase = typeof crudo.texto === "string" ? crudo.texto.trim() : "";
  if (!frase) return null;
  return {
    texto: frase,
    monto: montoDe(crudo.monto),
    fecha: fechaDe(crudo.fecha),
  };
}

function montoDe(valor: unknown): string | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return normalizarMonto(String(valor));
  if (typeof valor !== "string") return null;
  return normalizarMonto(valor.replace(/[$]/g, ""));
}

function fechaDe(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  const calendario = /^(\d{4})-(\d{2})-(\d{2})/.exec(limpio);
  if (!calendario) return null;
  const anio = Number(calendario[1]);
  const mes = Number(calendario[2]);
  const dia = Number(calendario[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return `${calendario[1]}-${calendario[2]}-${calendario[3]}`;
}

/**
 * Prompt rules for HYTO_MILE_OTRA_CON_GROQ only.
 * Empty when the switch is off, so the rest of pedidoVision stays unchanged.
 * Other switches, including HYTO_MILE_FALTANTES_GROQ, add their own block and do not edit this one.
 */
export function bloqueCoincideGroq(env: EntornoOtraGroq = process.env): string {
  if (!mileOtraConGroqActivo(env)) return "";
  return [
    'coincide is required on every reply. Use exactly one of "si", "parcial", or "no". Never omit the key. Never use null, true, or false.',
    '"si" only when the photo shows the thing the organizer asked for, including the right object or brand.',
    '"parcial" when that same thing is visible but something they asked for is missing or unfinished.',
    '"no" when the photo shows something else: a different brand or object, a selfie, a blur, or an unrelated scene.',
    'The JSON is invalid without "coincide". Include it as "si", "parcial", or "no".',
  ].join("\n");
}

/** Groq constrained decoding accepts strict schemas on these models. Anything else stays best-effort. */
export function modeloAdmiteEsquemaEstricto(modelo: string): boolean {
  return /^(?:qwen\/qwen3\.8-27b|openai\/gpt-oss-20b|openai\/gpt-oss-120b)$/i.test(modelo.trim());
}

/**
 * Schema fragment for HYTO_MILE_OTRA_CON_GROQ. Null when the switch is off.
 * Other switches add their own fragment beside this one.
 */
export function propiedadCoincide(env: EntornoOtraGroq = process.env): { coincide: { type: "string"; enum: string[] } } | null {
  if (!mileOtraConGroqActivo(env)) return null;
  return { coincide: { type: "string", enum: ["si", "parcial", "no"] } };
}

type FormatoRespuesta = { type: "json_object" } | { type: "json_schema"; json_schema: { name: string; strict: boolean; schema: Record<string, unknown> } };

/** Switch off: the same json_object as today. Switch on: coincide is a required enum, added only by propiedadCoincide. */
export function formatoRespuestaVision(modelo: string, env: EntornoOtraGroq = process.env, conRegla = false): FormatoRespuesta {
  const coincide = propiedadCoincide(env);
  if (!coincide) return { type: "json_object" };
  const properties: Record<string, unknown> = {
    tipo: { type: "string", enum: ["recibo", "trabajo", "otra"] },
    pais: nulo("string"),
    moneda: nulo("string"),
    monto_original: nulo("string"),
    monto_usd: { anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
    fecha: nulo("string"),
    comercio: nulo("string"),
    articulos: { type: "array", items: { type: "string" } },
    texto_completo: { type: "string" },
    legible: { type: "boolean" },
    faltantes: { type: "array", items: { type: "string" } },
    ...coincide,
  };
  if (conRegla) properties.cumple_reglas = { anyOf: [{ type: "boolean" }, { type: "null" }] };
  return {
    type: "json_schema",
    json_schema: {
      name: "lectura_hyto",
      strict: modeloAdmiteEsquemaEstricto(modelo),
      schema: {
        type: "object",
        additionalProperties: false,
        properties,
        required: Object.keys(properties),
      },
    },
  };
}

function nulo(tipo: string): { anyOf: Array<{ type: string }> } {
  return { anyOf: [{ type: tipo }, { type: "null" }] };
}

type MensajeGroq = { role: "user"; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> };

function cuerpoChat(modelo: string, formato: FormatoRespuesta, messages: MensajeGroq[], maxTokens: number): Record<string, unknown> {
  return {
    model: modelo,
    temperature: 0,
    max_completion_tokens: maxTokens,
    ...parametrosRazonamiento(modelo),
    response_format: formato,
    messages,
  };
}

function formatoCoincide(modelo: string): FormatoRespuesta {
  return {
    type: "json_schema",
    json_schema: {
      name: "coincide_hyto",
      strict: modeloAdmiteEsquemaEstricto(modelo),
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { coincide: { type: "string", enum: ["si", "parcial", "no"] } },
        required: ["coincide"],
      },
    },
  };
}

function pedidoSoloCoincide(contexto: ContextoPedido, texto: string): string {
  const condicion = contexto.condicion?.replace(/\s+/g, " ").trim().slice(0, MAX_CONDICION) ?? "";
  return [
    'Reply with JSON only. The only key is "coincide", and it must be "si", "parcial", or "no".',
    '"si" only when the description shows the thing the organizer asked for, including the right object or brand.',
    '"parcial" when that same thing is visible but something they asked for is missing.',
    '"no" when it shows something else.',
    condicion ? `The organizer asked for: "${condicion}".` : "",
    `Description: ${texto}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function postGroq(
  fetchImpl: typeof fetch,
  clave: string,
  cuerpo: Record<string, unknown>,
  signal: AbortSignal | undefined,
): Promise<Response> {
  try {
    return await fetchImpl(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${clave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(cuerpo),
      signal,
    });
  } catch (error) {
    throw falloDeExcepcion(error, "groq", clave);
  }
}

/**
 * True only for a schema rejection. HTTP 429 and any quota error are false:
 * those must not start another Groq call.
 */
async function rechazoDeEsquema(respuesta: Response): Promise<boolean> {
  if (respuesta.status === 429 || respuesta.status !== 400) return false;
  const crudo = await respuesta.clone().text();
  return !esCupo(respuesta.status, crudo);
}

async function leerRespuestaGroq(respuesta: Response, clave: string): Promise<{ contenido: string; finish: string | undefined; status: number }> {
  if (!respuesta.ok) throw await falloHttp(respuesta, "groq", clave);
  let json: { choices?: { finish_reason?: string; message?: { content?: unknown } }[] };
  try {
    json = (await respuesta.json()) as { choices?: { finish_reason?: string; message?: { content?: unknown } }[] };
  } catch {
    throw new FalloRevision("respuesta", { fuente: "groq", status: respuesta.status, providerMessage: "json", secreto: clave });
  }
  const choice = json.choices?.[0];
  const contenido = choice?.message?.content;
  if (typeof contenido !== "string") {
    throw new FalloRevision("respuesta", {
      fuente: "groq",
      status: respuesta.status,
      providerMessage: choice?.finish_reason === "length" ? "truncado" : "json",
      secreto: clave,
    });
  }
  return { contenido, finish: choice?.finish_reason, status: respuesta.status };
}

function descripcionDe(contenido: string, finish: string | undefined, status: number, contexto: ContextoPedido, clave: string): Descripcion {
  const descripcion = leerDescripcion(contenido, contexto);
  if (!descripcion) {
    const cortado = finish === "length" || (contenido.includes("{") && !contenido.includes("}"));
    throw new FalloRevision("respuesta", {
      fuente: "groq",
      status,
      providerMessage: cortado ? "truncado" : "json",
      secreto: clave,
    });
  }
  return descripcion;
}

/**
 * One text call, no photo, when the reading still has no coincide.
 * A 429, a quota error, or any other failure returns null and does not call again.
 * The something-else cap stays, which is the safe side.
 */
async function coincidePorTexto(
  fetchImpl: typeof fetch,
  clave: string,
  modelo: string,
  contexto: ContextoPedido,
  texto: string,
  signal: AbortSignal | undefined,
): Promise<CoincideGroq | null> {
  try {
    const respuesta = await postGroq(
      fetchImpl,
      clave,
      cuerpoChat(modelo, formatoCoincide(modelo), [{ role: "user", content: pedidoSoloCoincide(contexto, texto) }], MAX_TOKENS_COINCIDE),
      signal,
    );
    if (!respuesta.ok) return null;
    const leida = await leerRespuestaGroq(respuesta, clave);
    return coincideMencionado(leida.contenido);
  } catch {
    return null;
  }
}

export async function describirFoto(
  bytes: Uint8Array,
  tipo: string,
  clave: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
  contexto: ContextoPedido = {},
  env: EntornoPedidoVision = process.env,
): Promise<Descripcion> {
  if (!clave.trim()) throw new FalloRevision("sin_clave", { fuente: "groq", providerMessage: "GROQ_API_KEY" });
  const imagen = await ajustarParaVision(bytes, tipo || "image/jpeg");
  const modelo = modeloVision();
  const activo = mileOtraConGroqActivo(env);
  const tipoRegla = contexto.tipoTarea ?? "trabajo";
  const formato = formatoRespuestaVision(modelo, env, Boolean(reglaDeEvento(contexto.evento, tipoRegla)));
  const mensajes: MensajeGroq[] = [
    {
      role: "user",
      content: [
        { type: "text", text: pedidoVision(contexto, env) },
        { type: "image_url", image_url: { url: `data:${imagen.tipo};base64,${Buffer.from(imagen.bytes).toString("base64")}` } },
      ],
    },
  ];
  let respuesta = await postGroq(fetchImpl, clave, cuerpoChat(modelo, formato, mensajes, MAX_TOKENS), signal);
  // The photo call is the first one. At most one more, and never after a 429 or a quota error.
  let extras = 0;
  if (activo && formato.type === "json_schema" && extras < 1 && (await rechazoDeEsquema(respuesta))) {
    extras += 1;
    respuesta = await postGroq(fetchImpl, clave, cuerpoChat(modelo, { type: "json_object" }, mensajes, MAX_TOKENS), signal);
  }
  const leida = await leerRespuestaGroq(respuesta, clave);
  const descripcion = descripcionDe(leida.contenido, leida.finish, leida.status, contexto, clave);
  if (!activo || !descripcion.lectura || descripcion.lectura.coincide) return descripcion;
  const mencionado = coincideMencionado(leida.contenido);
  if (mencionado) return { ...descripcion, lectura: { ...descripcion.lectura, coincide: mencionado } };
  if (extras >= 1) return descripcion;
  extras += 1;
  const pedido = await coincidePorTexto(fetchImpl, clave, modelo, contexto, descripcion.texto, signal);
  if (!pedido) return descripcion;
  return { ...descripcion, lectura: { ...descripcion.lectura, coincide: pedido } };
}
