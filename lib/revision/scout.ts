import { normalizarMonto } from "@/lib/admin/vista";
import type { Descripcion } from "./armar";

const MODELO = "qwen/qwen3.8-27b";
const BASE = "https://api.groq.com/openai/v1";

const PEDIDO =
  "Describe la foto en una frase corta, en español. Si es una factura o un comprobante, extrae el monto en dólares (solo dígitos y hasta dos decimales, sin símbolo) y la fecha como YYYY-MM-DD. Si no es una factura, monto y fecha van null. Responde solo JSON con las claves texto, monto y fecha.";

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
): Promise<Descripcion | null> {
  const respuesta = await fetchImpl(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${clave}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO,
      temperature: 0,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PEDIDO },
            { type: "image_url", image_url: { url: `data:${tipo || "image/jpeg"};base64,${Buffer.from(bytes).toString("base64")}` } },
          ],
        },
      ],
    }),
    signal,
  });
  if (!respuesta.ok) return null;
  const json = (await respuesta.json()) as { choices?: { message?: { content?: unknown } }[] };
  const contenido = json.choices?.[0]?.message?.content;
  if (typeof contenido !== "string") return null;
  return leerDescripcion(contenido);
}
