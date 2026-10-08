import { normalizarMonto } from "@/lib/admin/vista";
import { ajustarParaVision } from "@/lib/evidencia/vision";
import type { TipoTarea } from "@/lib/integrante/tipos";
import type { Descripcion } from "./armar";
import { bloqueContextoEvento, reglaDeEvento, type ContextoEvento } from "./contexto-evento";
import { bloqueOrganizacion } from "./organizacion";
import { falloDeExcepcion, falloHttp, FalloRevision } from "./fallo";
import { CLAVES_LECTURA, leerLectura } from "./lectura";

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
const MAX_CONDICION = 600;

export type ContextoPedido = {
  /** What the organizer asked the photo to show. */
  condicion?: string | null;
  tipoTarea?: TipoTarea | null;
  idioma?: "en" | "es";
  /** Background about the event. Empty leaves the prompt as it was. */
  evento?: ContextoEvento | null;
  /** The organizer's company description. Empty, or the switch off, leaves the prompt as it was. */
  organizacion?: string | null;
};

/** The prompt sent with the photo. The task condition is part of it, so the description answers the request. */
export function pedidoVision(contexto: ContextoPedido = {}): string {
  const condicion = contexto.condicion?.replace(/\s+/g, " ").trim().slice(0, MAX_CONDICION) ?? "";
  const tarea =
    contexto.tipoTarea === "reembolso"
      ? "This is a reimbursement task, so the photo should be a receipt or an invoice."
      : contexto.tipoTarea === "trabajo"
        ? "This is a work task, so the photo should show the place, the people, the objects, the food, or the result the organizer asked for."
        : "";
  const espanol = contexto.idioma === "es";
  const regla = reglaDeEvento(contexto.evento);
  const claves = regla ? [...CLAVES_LECTURA, "cumple_reglas"] : [...CLAVES_LECTURA];
  return [
    "You read a photo that a volunteer sent as evidence for a task.",
    condicion ? `The organizer asked for: "${condicion}".` : "",
    tarea,
    bloqueContextoEvento(contexto.evento),
    bloqueOrganizacion(contexto.organizacion),
    "Describe only what is visible. Never invent a detail, an amount, a date, or a currency.",
    `Reply with JSON only, using exactly these keys: ${claves.join(", ")}.`,
    regla
      ? "cumple_reglas: true only when the photo meets every rule inside <event_context>. false when it breaks at least one, for example a receipt from a different kind of store than the rule allows. null only when the photo does not show enough to decide."
      : "",
    'tipo: "recibo" for a receipt, an invoice, or a payment screen. "trabajo" for a place, people, objects, food, or work the organizer asked to see. "otra" for anything else, such as a selfie or an unrelated image.',
    (espanol
      ? "texto_completo: a detailed description in Spanish only, never English or any other language, even when the request or the receipt is in English. 4 to 8 sentences. Say what is shown and where. Say what was done, whether it looks finished, and which tools, materials, or items are visible. Say how the photo relates to what the organizer asked for, and what is missing, unfinished, or not visible. For a receipt, include the merchant, the items, the total exactly as printed with its currency, and the date exactly as printed."
      : "texto_completo: a detailed description in English only, never Spanish or any other language, even when the request or the receipt is in Spanish. 4 to 8 sentences. Say what is shown and where. Say what was done, whether it looks finished, and which tools, materials, or items are visible. Say how the photo relates to what the organizer asked for, and what is missing, unfinished, or not visible. For a receipt, include the merchant, the items, the total exactly as printed with its currency, and the date exactly as printed."),
    "legible: true if the photo is sharp and clear enough to judge. false if it is blurry, too dark, or cut off.",
    "pais: the country as a two-letter ISO code, such as CR for Costa Rica, only if the photo shows it (an address, a phone code, a tax id, or the currency). Otherwise null.",
    "moneda: the ISO 4217 code of the total. ₡, ¢, colones, or CRC is CRC, Costa Rican colones. Use USD only when the receipt shows US$, USD, or dollars, or a $ total on a receipt from Costa Rica or the United States. If the currency is not shown, use null. Never guess USD.",
    "monto_original: the total exactly as printed, keeping its symbol and separators, such as ₡7.950,00 or 15.179,99. Costa Rican receipts often use a dot for thousands and a comma for decimals. Null if there is no total.",
    "monto_usd: the total in US dollars only when the receipt itself prints it in US dollars. Otherwise null. Do not convert colones or any other currency.",
    "fecha: the purchase date exactly as printed, such as 02/10/2026. Costa Rica writes the day first (DD/MM/YYYY). Null if there is no date.",
    "comercio: the store or business name, or null.",
    "articulos: a list of the items on the receipt, or of the main objects that prove the work. An empty list if there are none.",
    (espanol
      ? "faltantes: a list of short phrases in Spanish only, never English, naming what the organizer asked for that the photo does not show. An empty list if nothing is missing."
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

export async function describirFoto(
  bytes: Uint8Array,
  tipo: string,
  clave: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
  contexto: ContextoPedido = {},
): Promise<Descripcion> {
  if (!clave.trim()) throw new FalloRevision("sin_clave", { fuente: "groq", providerMessage: "GROQ_API_KEY" });
  const imagen = await ajustarParaVision(bytes, tipo || "image/jpeg");
  const modelo = modeloVision();
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${clave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0,
        max_completion_tokens: MAX_TOKENS,
        ...parametrosRazonamiento(modelo),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: pedidoVision(contexto) },
              { type: "image_url", image_url: { url: `data:${imagen.tipo};base64,${Buffer.from(imagen.bytes).toString("base64")}` } },
            ],
          },
        ],
      }),
      signal,
    });
  } catch (error) {
    throw falloDeExcepcion(error, "groq", clave);
  }
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
  const descripcion = leerDescripcion(contenido, contexto);
  if (!descripcion) {
    const cortado = choice?.finish_reason === "length" || (contenido.includes("{") && !contenido.includes("}"));
    throw new FalloRevision("respuesta", {
      fuente: "groq",
      status: respuesta.status,
      providerMessage: cortado ? "truncado" : "json",
      secreto: clave,
    });
  }
  return descripcion;
}
