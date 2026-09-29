import type { Senales } from "./armar";
import { nivelScore } from "./armar";

export function urlLaya(base: string): string {
  const limpia = base.trim().replace(/\/$/, "");
  if (limpia.endsWith("/v1/systemone")) return limpia;
  return `${limpia}/v1/systemone`;
}

export function cuerpoLaya(texto: string, condicion: string): unknown {
  return {
    model: "multilingual",
    state: `${texto}\nCondición: ${condicion}`,
    questions: {
      choice: {
        type: "choice",
        instructions: "Qué muestra la foto?",
        criteria: {
          trabajo: "Se ve el trabajo hecho",
          factura: "Se ve una factura o un comprobante",
          otra: "No se distingue",
        },
      },
      noul: {
        type: "noul",
        instructions: condicion ? `La foto cumple esta condición: ${condicion}` : "La foto muestra lo que se pidió",
      },
      score: {
        type: "score",
        instructions: "Qué tan completa está la evidencia?",
        criteria: ["Casi no se ve lo pedido", "Se ve parte y falta algo", "Se ve lo pedido"],
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

const NIVELES = ["insuficiente", "parcial", "cumplió"] as const;

function buscarScore(json: unknown): string | null {
  const nodo = nodoScore(json);
  if (nodo) {
    const indice = indiceMayor(nodo.probabilities);
    if (indice !== null) return NIVELES[indice];
  }
  const directo = leerCampo(json, "score");
  if (typeof directo === "string" && directo.trim()) return directo.trim();
  return null;
}

function nodoScore(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const crudo = json as Record<string, unknown>;
  if (crudo.type === "score" && "probabilities" in crudo) return crudo;
  if ("probabilities" in crudo && typeof crudo.score === "number") return crudo;
  for (const valor of Object.values(crudo)) {
    if (!valor || typeof valor !== "object") continue;
    const encontrado = nodoScore(valor);
    if (encontrado) return encontrado;
  }
  return null;
}

function indiceMayor(probabilities: unknown): number | null {
  const valores = listaProbabilidades(probabilities);
  if (!valores) return null;
  let mejor = -Infinity;
  let indice = -1;
  for (let i = 0; i < valores.length; i += 1) {
    const probabilidad = valores[i];
    if (probabilidad === null || probabilidad <= mejor) continue;
    mejor = probabilidad;
    indice = i;
  }
  if (indice < 0 || indice > 2) return null;
  return indice;
}

function listaProbabilidades(probabilities: unknown): Array<number | null> | null {
  if (Array.isArray(probabilities)) return probabilities.map(numero);
  if (!probabilities || typeof probabilities !== "object") return null;
  const crudo = probabilities as Record<string, unknown>;
  const indices = Object.keys(crudo)
    .map((clave) => Number(clave))
    .filter((indice) => Number.isInteger(indice) && indice >= 0);
  if (indices.length === 0) return null;
  const lista: Array<number | null> = Array.from({ length: Math.max(...indices) + 1 }, () => null);
  for (const indice of indices) lista[indice] = numero(crudo[String(indice)]);
  return lista;
}

function numero(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string" && valor.trim() && Number.isFinite(Number(valor))) return Number(valor);
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
): Promise<Senales | null> {
  const clave = process.env.LAYA_API_KEY?.trim();
  const respuesta = await fetchImpl(urlLaya(base), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(clave ? { authorization: `Bearer ${clave}` } : {}),
    },
    body: JSON.stringify(cuerpoLaya(texto, condicion)),
    signal,
  });
  if (!respuesta.ok) return null;
  return leerLaya(await respuesta.json());
}
