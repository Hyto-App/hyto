/**
 * Event options on Mile's work questions stay off unless
 * HYTO_MILE_PREGUNTAS_EVENTO is exactly "on".
 * Unset, empty, and "off" keep the current questions and scoring.
 */
export const HYTO_MILE_PREGUNTAS_EVENTO = "HYTO_MILE_PREGUNTAS_EVENTO";

/** NODE_ENV is listed so this accepts process.env without turning the flag on. */
export type EntornoPreguntasEvento = {
  HYTO_MILE_PREGUNTAS_EVENTO?: string;
  NODE_ENV?: string;
};

export function preguntasEventoActivas(env: EntornoPreguntasEvento = process.env): boolean {
  const valor = (env.HYTO_MILE_PREGUNTAS_EVENTO ?? "off").trim().toLowerCase();
  return valor === "on";
}
