/**
 * HYTO_MILE_OTRA_CON_GROQ stays off unless the value is exactly "on"
 * (after trim and lowercasing, same as the other HYTO_* switches).
 * Off: Laya's "something else" answer caps the grade as it does today, and the
 * vision prompt does not ask for coincide.
 * On: that cap, and the grade of 0 when classification is "otra" and the match
 * question is "es_otra_cosa", are withheld only when Groq's coincide is "si".
 * "parcial", "no", and a missing field keep the cap.
 */
export const HYTO_MILE_OTRA_CON_GROQ = "HYTO_MILE_OTRA_CON_GROQ";

export type EntornoOtraGroq = {
  HYTO_MILE_OTRA_CON_GROQ?: string;
  [clave: string]: string | undefined;
};

/** Groq's structured match. Absent on readings from before this switch. */
export type CoincideGroq = "si" | "parcial" | "no";

export function mileOtraConGroqActivo(env: EntornoOtraGroq = process.env): boolean {
  const valor = (env.HYTO_MILE_OTRA_CON_GROQ ?? "off").trim().toLowerCase();
  return valor === "on";
}

/**
 * Whether Laya may apply the "something else" cap and the zero shortcut.
 * Switch off: always, which is today's behavior.
 * Switch on: withheld only when coincide is "si".
 * "parcial" still caps (a different brand is not a full match). "no" and a missing
 * field stay capped too, including an old reading.
 */
export function layaPuedeTaparPorOtra(
  lectura: { coincide?: CoincideGroq | null } | null | undefined,
  env: EntornoOtraGroq = process.env,
): boolean {
  if (!mileOtraConGroqActivo(env)) return true;
  return lectura?.coincide !== "si";
}
