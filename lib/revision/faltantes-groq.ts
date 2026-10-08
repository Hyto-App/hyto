import type { Senales } from "./armar";
import type { LecturaEvidencia } from "./lectura";
import { notaDeTexto, notaDeTrabajo, notaEntera, PESOS_PREGUNTAS } from "./pesos";
import { escribirSnapshot, leerSnapshot } from "./snapshot-razones";

/**
 * Laya's "is something missing?" (v4) stays in charge unless this is exactly "on".
 * Unset, empty, "off", "1", and "true" keep the current grade.
 */
export const HYTO_MILE_FALTANTES_GROQ = "HYTO_MILE_FALTANTES_GROQ";

/** NODE_ENV is listed so this accepts process.env without turning the flag on. */
export type EntornoFaltantesGroq = {
  HYTO_MILE_FALTANTES_GROQ?: string;
  NODE_ENV?: string;
};

export function mileFaltantesGroqActivo(env: EntornoFaltantesGroq = process.env): boolean {
  const valor = (env.HYTO_MILE_FALTANTES_GROQ ?? "off").trim().toLowerCase();
  return valor === "on";
}

/**
 * Extra vision instructions for faltantes, legible, and printed names.
 * Empty unless HYTO_MILE_FALTANTES_GROQ is exactly "on", so the prompt stays as it is.
 * This is its own block. HYTO_MILE_OTRA_CON_GROQ adds the coincide field beside it, not inside it.
 */
export function bloqueFaltantesGroq(idioma: "en" | "es" = "en", env: EntornoFaltantesGroq = process.env): string {
  if (!mileFaltantesGroqActivo(env)) return "";
  const lista = idioma === "es"
    ? "Keep each faltantes phrase in Spanish only, and in formal usted if it addresses the reader."
    : "Keep each faltantes phrase in English only.";
  return [
    "Reading rules for HYTO_MILE_FALTANTES_GROQ:",
    "In faltantes, list only what the organizer's request asks for and the photo does not show. Do not list anything the request did not ask for.",
    "Do not list as missing anything the description already says is visible.",
    "If nothing they asked for is missing, faltantes is an empty list.",
    "legible is false only when the subject the organizer asked for is too blurry, too dark, or cut off to judge. An intentionally blurred background (bokeh) does not make the photo unreadable when that subject is clear.",
    "Copy brand names, logos, and other printed words exactly as they appear. Do not correct, translate, or guess a spelling.",
    lista,
  ].join("\n");
}

/** Groq named at least one thing the photo does not show. Blank entries do not count. */
export function faltaAlgo(faltantes: readonly string[] | null | undefined): boolean {
  if (!faltantes) return false;
  return faltantes.some((item) => item.trim().length > 0);
}

/**
 * When the switch is on, v4 follows the vision reading's faltantes list.
 * An empty list means nothing is missing, so those 10 points are not lost.
 * A non-empty list means something is missing, even when Laya said no.
 * The rest of the grade is untouched. No structured reading, no work answers,
 * or a score that is not the weighted sum: the signals come back unchanged.
 */
export function aplicarV4DeFaltantes(
  senales: Senales,
  lectura: LecturaEvidencia | null | undefined,
  condicion: string,
  env: EntornoFaltantesGroq = process.env,
): Senales {
  if (!mileFaltantesGroqActivo(env)) return senales;
  if (!lectura || !Array.isArray(lectura.faltantes)) return senales;
  if (!senales.detalle) return senales;
  const detalle = leerSnapshot(senales.detalle);
  const trabajo = detalle?.trabajo;
  if (!detalle || !trabajo) return senales;
  const v4 = faltaAlgo(lectura.faltantes);
  if (trabajo.v4 === v4) return senales;
  const nota = notaDeTexto(senales.score);
  if (nota === null || nota !== notaDeTrabajo(trabajo, condicion)) return senales;
  const peso = PESOS_PREGUNTAS.trabajo.v4;
  const puntos = (falta: boolean) => (falta ? 0 : peso);
  const ajustada = notaEntera(nota + puntos(v4) - puntos(trabajo.v4));
  return {
    ...senales,
    score: String(ajustada),
    noul: ajustada === 100,
    detalle: escribirSnapshot({ ...detalle, trabajo: { ...trabajo, v4 } }),
  };
}
