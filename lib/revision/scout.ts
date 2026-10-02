import { normalizarMonto } from "@/lib/admin/vista";
import { ajustarParaVision } from "@/lib/evidencia/vision";
import type { Descripcion } from "./armar";
import { falloDeExcepcion, falloHttp, FalloRevision } from "./fallo";

export const MODELO_VISION_DEFECTO = "qwen/qwen3.8-27b";

export function modeloVision(env: NodeJS.ProcessEnv = process.env): string {
  const pedido = env.GROQ_VISION_MODEL?.trim();
  return pedido || MODELO_VISION_DEFECTO;
}
const BASE = "https://api.groq.com/openai/v1";
const MAX_TOKENS = 1024;

const PEDIDO =
  "Describe the photo in one short sentence, in English. If it is an invoice or a receipt, extract the amount in dollars (digits only, up to two decimals, no symbol) and the date as YYYY-MM-DD. If it is not a receipt, amount and date are null. Reply with JSON only, using the keys texto, monto, and fecha.";

export function leerDescripcion(texto: string): Descripcion | null {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) return null;
  let json: unknown;
  try {
    json = JSON.parse(texto.slice(inicio, fin + 1));
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;
  const crudo = json as Record<string, unknown>;
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
): Promise<Descripcion> {
  if (!clave.trim()) throw new FalloRevision("sin_clave", { fuente: "groq", providerMessage: "GROQ_API_KEY" });
  const imagen = await ajustarParaVision(bytes, tipo || "image/jpeg");
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${clave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modeloVision(),
        temperature: 0,
        max_completion_tokens: MAX_TOKENS,
        reasoning_effort: "none",
        reasoning_format: "hidden",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PEDIDO },
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
  const descripcion = leerDescripcion(contenido);
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
