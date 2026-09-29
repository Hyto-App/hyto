import { claveDeLaya } from "@/lib/config/entorno";
import type { Senales } from "./armar";
import { nivelScore } from "./armar";
import { falloDeExcepcion, falloHttp, FalloRevision } from "./fallo";

export function urlLaya(base: string): string {
  const limpia = base.trim().replace(/\/$/, "");
  if (limpia.endsWith("/v1/systemone")) return limpia;
  return `${limpia}/v1/systemone`;
}

export function cuerpoLaya(texto: string, condicion: string): unknown {
  return {
    model: "multilingual",
    state: `${texto}\nCondition: ${condicion}`,
    questions: {
      choice: {
        type: "choice",
        instructions: "What does the photo show?",
        criteria: {
          trabajo: "The finished work is visible",
          factura: "An invoice or a receipt is visible",
          otra: "It is not clear",
        },
      },
      noul: {
        type: "noul",
        instructions: condicion ? `The photo meets this condition: ${condicion}` : "The photo shows what was requested",
      },
      score: {
        type: "score",
        instructions: "How complete is the evidence?",
        criteria: {
          insuficiente: "What was requested is barely visible",
          parcial: "Part of it shows and something is missing",
          cumplió: "What was requested is visible",
        },
      },
    },
  };
}

export function leerLaya(json: unknown): Senales | null {
  if (!json || typeof json !== "object") return null;
  const choice = buscarChoice(json);
  const noul = buscarNoul(json);
  const score = buscarScore(json);
  if (!choice || noul === null || !score || !nivelScore(score)) return null;
  return { choice, noul, score: nivelScore(score)! };
}

function buscarChoice(json: unknown): string | null {
  const directo = leerCampo(json, "choice");
  if (typeof directo === "string" && directo.trim()) return directo.trim().slice(0, 40);
  return null;
}

function buscarScore(json: unknown): string | null {
  const directo = leerCampo(json, "score");
  if (typeof directo === "string" && directo.trim()) return directo.trim();
  return null;
}

function buscarNoul(json: unknown): boolean | null {
  const directo = leerCampo(json, "noul");
  if (typeof directo === "boolean") return directo;
  if (typeof directo === "number" && Number.isFinite(directo)) return directo >= 0.5;
  if (typeof directo === "string") {
    const limpio = directo.trim().toLowerCase();
    if (limpio === "true" || limpio === "si" || limpio === "sí" || limpio === "yes") return true;
    if (limpio === "false" || limpio === "no") return false;
  }
  return null;
}

function leerCampo(json: unknown, clave: string): unknown {
  if (!json || typeof json !== "object") return null;
  const crudo = json as Record<string, unknown>;
  if (clave in crudo && (typeof crudo[clave] !== "object" || crudo[clave] === null)) return crudo[clave];
  const anidado = crudo[clave];
  if (anidado && typeof anidado === "object" && clave in (anidado as Record<string, unknown>)) {
    return (anidado as Record<string, unknown>)[clave];
  }
  for (const valor of Object.values(crudo)) {
    if (!valor || typeof valor !== "object") continue;
    const encontrado = leerCampo(valor, clave);
    if (encontrado !== null && encontrado !== undefined) return encontrado;
  }
  return null;
}

export async function preguntarLaya(
  base: string,
  texto: string,
  condicion: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<Senales> {
  const clave = claveDeLaya();
  if (!base.trim()) throw new FalloRevision("sin_clave", { fuente: "laya", providerMessage: "LAYA_URL" });
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(urlLaya(base), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(clave ? { authorization: `Bearer ${clave}` } : {}),
      },
      body: JSON.stringify(cuerpoLaya(texto, condicion)),
      signal,
    });
  } catch (error) {
    throw falloDeExcepcion(error, "laya", clave);
  }
  if (!respuesta.ok) throw await falloHttp(respuesta, "laya", clave);
  let json: unknown;
  try {
    json = await respuesta.json();
  } catch {
    throw new FalloRevision("respuesta", { fuente: "laya", status: respuesta.status, providerMessage: "json", secreto: clave });
  }
  const senales = leerLaya(json);
  if (!senales) {
    throw new FalloRevision("respuesta", { fuente: "laya", status: respuesta.status, providerMessage: "json", secreto: clave });
  }
  return senales;
}
