import { claveDeGroq } from "@/lib/config/entorno";
import { modeloVision } from "./scout";
import { MAX_REQUISITOS } from "./requisitos";

const BASE = "https://api.groq.com/openai/v1";
const TEXTO_MAX = 180;

const PEDIDO = `You help an organizer write photo requirements for a community task or a receipt.
Reply with JSON only: {"requisitos":["..."]}.
Write at most 3 short requirements a photo can show.
Each item is one sentence, plain text, no HTML, no numbering.
Use the language of the title and description.
If the title is Spanish, use tú (not vos, not usted).
If you cannot tell, return {"requisitos":[]}.`;

export function leerSugerencias(texto: string): string[] {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) return [];
  let json: unknown;
  try {
    json = JSON.parse(texto.slice(inicio, fin + 1));
  } catch {
    return [];
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) return [];
  const lista = (json as { requisitos?: unknown }).requisitos;
  if (!Array.isArray(lista)) return [];
  const salida: string[] = [];
  const vistos = new Set<string>();
  for (const item of lista) {
    if (typeof item !== "string") continue;
    const limpio = item.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, TEXTO_MAX);
    if (!limpio) continue;
    const clave = limpio.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push(limpio);
    if (salida.length === MAX_REQUISITOS) break;
  }
  return salida;
}

/**
 * Groq writes the lines. Laya only classifies, so a down or missing model returns an empty list.
 */
export async function sugerirRequisitos(
  titulo: string,
  descripcion: string,
  fetchImpl: typeof fetch = fetch,
  clave: string | null = claveDeGroq(),
): Promise<string[]> {
  if (!clave?.trim()) return [];
  const asunto = titulo.trim().slice(0, 120);
  const detalle = descripcion.trim().slice(0, 500);
  if (!asunto && !detalle) return [];
  try {
    const respuesta = await fetchImpl(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${clave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modeloVision(),
        temperature: 0,
        max_completion_tokens: 400,
        reasoning_effort: "none",
        reasoning_format: "hidden",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: `${PEDIDO}\nTitle: ${asunto}\nDescription: ${detalle}`,
          },
        ],
      }),
    });
    if (!respuesta.ok) return [];
    const json = (await respuesta.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = json.choices?.[0]?.message?.content;
    return typeof content === "string" ? leerSugerencias(content) : [];
  } catch {
    return [];
  }
}
