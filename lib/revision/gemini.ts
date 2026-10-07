import { ajustarParaVision } from "@/lib/evidencia/vision";
import type { Descripcion } from "./armar";
import { falloDeExcepcion, falloHttp, FalloRevision } from "./fallo";
import { leerDescripcion, MAX_TOKENS, pedidoVision, type ContextoPedido } from "./scout";

export const MODELO_GEMINI_DEFECTO = "gemini-flash-lite-latest";

export function modeloGemini(env: NodeJS.ProcessEnv = process.env): string {
  const pedido = env.GEMINI_VISION_MODEL?.trim();
  return pedido || MODELO_GEMINI_DEFECTO;
}

const BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

/**
 * Describes the photo with Gemini's OpenAI-compatible chat endpoint.
 * Same prompt and parser as Groq. Called only after the Groq vision call fails.
 */
export async function describirFotoGemini(
  bytes: Uint8Array,
  tipo: string,
  clave: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
  contexto: ContextoPedido = {},
): Promise<Descripcion> {
  if (!clave.trim()) throw new FalloRevision("sin_clave", { fuente: "gemini", providerMessage: "GEMINI_API_KEY" });
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
        model: modeloGemini(),
        temperature: 0,
        max_completion_tokens: MAX_TOKENS,
        reasoning_effort: "low",
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
    throw falloDeExcepcion(error, "gemini", clave);
  }
  if (!respuesta.ok) throw await falloHttp(respuesta, "gemini", clave);
  let json: { choices?: { finish_reason?: string; message?: { content?: unknown } }[] };
  try {
    json = (await respuesta.json()) as { choices?: { finish_reason?: string; message?: { content?: unknown } }[] };
  } catch {
    throw new FalloRevision("respuesta", { fuente: "gemini", status: respuesta.status, providerMessage: "json", secreto: clave });
  }
  const choice = json.choices?.[0];
  const contenido = choice?.message?.content;
  if (typeof contenido !== "string") {
    throw new FalloRevision("respuesta", {
      fuente: "gemini",
      status: respuesta.status,
      providerMessage: choice?.finish_reason === "length" ? "truncado" : "json",
      secreto: clave,
    });
  }
  const descripcion = leerDescripcion(contenido, contexto);
  if (!descripcion) {
    const cortado = choice?.finish_reason === "length" || (contenido.includes("{") && !contenido.includes("}"));
    throw new FalloRevision("respuesta", {
      fuente: "gemini",
      status: respuesta.status,
      providerMessage: cortado ? "truncado" : "json",
      secreto: clave,
    });
  }
  return descripcion;
}
