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
