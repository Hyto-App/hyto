import { claveDeLaya } from "@/lib/config/entorno";
import type { TipoTarea } from "@/lib/integrante/tipos";
import type { Senales } from "./armar";
import { nivelScore } from "./armar";
import { falloDeExcepcion, falloHttp, FalloRevision } from "./fallo";

export function urlLaya(base: string): string {
  const limpia = base.trim().replace(/\/$/, "");
  if (limpia.endsWith("/v1/systemone")) return limpia;
  return `${limpia}/v1/systemone`;
}

export function cuerpoLaya(texto: string, condicion: string, tipo: TipoTarea): unknown {
  const pedido = condicion.trim();
  return {
    model: "multilingual",
    state: `${texto}\nCondition: ${pedido}`,
    questions: {
      choice: choiceDe(tipo, pedido),
      noul: noulDe(tipo, pedido),
      score: scoreDe(tipo, pedido),
    },
  };
}

// Laya never sees the photo. Each question is a check against the written description.
function choiceDe(tipo: TipoTarea, condicion: string) {
  if (tipo === "reembolso") {
    return {
      type: "choice" as const,
      instructions: condicion
        ? `Which label matches the written description? This reimbursement asks for: "${condicion}". Count only evidence the description names, not words copied from the condition.`
        : "Which label matches the written description of this reimbursement? Count only evidence the description names.",
      criteria: {
        trabajo: "The description names finished work and does not name a receipt or an invoice.",
        factura: condicion
          ? `The description names a receipt or an invoice for this request: "${condicion}".`
          : "The description names a receipt or an invoice.",
        otra: "The description does not name a receipt or an invoice. Use this for a meal with no document, a blank wall, or a vague scene.",
      },
    };
  }
  return {
    type: "choice" as const,
    instructions: condicion
      ? `Which label matches the written description? This work asks for: "${condicion}". Count only evidence the description names, not words copied from the condition.`
      : "Which label matches the written description of this work? Count only evidence the description names.",
    criteria: {
      trabajo: condicion
        ? `The description names the finished work this request asks for: "${condicion}".`
        : "The description names a finished piece of work.",
      factura: "The description names an invoice or a receipt, not the finished work.",
      otra: "The description does not name the finished work. Use this for a blank wall, an unrelated scene, or a vague scene.",
    },
  };
}

function noulDe(tipo: TipoTarea, condicion: string) {
  if (condicion) {
    const evidencia =
      tipo === "reembolso"
        ? `a receipt or an invoice for the evidence this condition requests: "${condicion}"`
        : `the evidence this condition requests: "${condicion}"`;
    return {
      type: "noul" as const,
      instructions: `The written description explicitly names ${evidencia}. A blank wall, an empty room, or a description that never names that evidence makes this statement false.`,
    };
  }
  if (tipo === "reembolso") {
    return {
      type: "noul" as const,
      instructions:
        "The written description explicitly names a receipt or an invoice. A meal, a blank wall, or a description that names no receipt and no invoice makes this statement false.",
    };
  }
  return {
    type: "noul" as const,
    instructions:
      "The written description explicitly names a finished piece of work and what was done. A blank wall, an empty room, or a description that names no finished work makes this statement false.",
  };
}

function scoreDe(tipo: TipoTarea, condicion: string) {
  if (tipo === "reembolso") {
    return {
      type: "score" as const,
      instructions: condicion
        ? `How much of the reimbursement evidence does the written description name? Required evidence: "${condicion}". Count a detail only when the description states it. Do not treat the condition text itself as something the description said.`
        : "How much of a reimbursement receipt does the written description name? Count a detail only when the description states it.",
      criteria: condicion
        ? [
            "The description does not name a receipt and does not name an invoice.",
            "The description names a receipt or an invoice, and it leaves out part of the required evidence.",
            "The description names a receipt or an invoice and names every part of the required evidence.",
          ]
        : [
            "The description does not name a receipt and does not name an invoice.",
            "The description names a receipt or an invoice, and it does not state both an amount and a date.",
            "The description names a receipt or an invoice, and it states both an amount and a date.",
          ],
    };
  }
  return {
    type: "score" as const,
    instructions: condicion
      ? `How much of the required work evidence does the written description name? Required evidence: "${condicion}". Count a detail only when the description states it. Do not treat the condition text itself as something the description said.`
      : "How much finished work does the written description name? Count a detail only when the description states it.",
    criteria: condicion
      ? [
          "The description does not name the required evidence. A blank wall, an empty room, or an unrelated scene is this level.",
          "The description names some of the required evidence and leaves out at least one part the condition asks for.",
          "The description names every part the condition asks for.",
        ]
      : [
          "The description does not name any finished work. A blank wall, an empty room, or an unrelated scene is this level.",
          "The description names some finished work and also says that part of it is missing or not shown.",
          "The description names the finished work and does not say that any part of it is missing or not shown.",
        ],
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
  tipo: TipoTarea,
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
      body: JSON.stringify(cuerpoLaya(texto, condicion, tipo)),
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
