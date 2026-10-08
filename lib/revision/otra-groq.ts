/**
 * HYTO_MILE_OTRA_CON_GROQ stays off unless the value is exactly "on"
 * (after trim and lowercasing, same as the other HYTO_* switches).
 * Off: Laya's "something else" answer caps the grade as it does today, and the
 * vision prompt does not ask for coincide.
 * On: that cap, and the grade of 0 when classification is "otra" and the match
 * question is "es_otra_cosa", apply only when Groq does not say the photo matches.
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
 * Switch on: only when Groq did not mark the photo as a match or a partial match.
 * A missing coincide is not a match, so an old reading, or a reply that omitted the
 * field, stays capped. A photo Groq calls "no" stays capped too.
 */
export function layaPuedeTaparPorOtra(
  lectura: { coincide?: CoincideGroq | null } | null | undefined,
  env: EntornoOtraGroq = process.env,
): boolean {
  if (!mileOtraConGroqActivo(env)) return true;
  const coincide = lectura?.coincide ?? null;
  return coincide !== "si" && coincide !== "parcial";
}
