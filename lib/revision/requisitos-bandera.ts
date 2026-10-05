/**
 * Structured photo requirements stay off unless HYTO_MILE_REQUISITOS is exactly "on".
 * Unset, empty, and "off" keep the live review on condicion and the existing Laya questions.
 * HYTO_MILE_INTENTOS is how many photos Mile may send back. Unset or invalid means 3.
 */
export const HYTO_MILE_REQUISITOS = "HYTO_MILE_REQUISITOS";
export const HYTO_MILE_INTENTOS = "HYTO_MILE_INTENTOS";
export const INTENTOS_MILE_DEFECTO = 3;

export type EntornoMile = {
  HYTO_MILE_REQUISITOS?: string;
  HYTO_MILE_INTENTOS?: string;
  NODE_ENV?: string;
};

export function mileRequisitosActivo(env: EntornoMile = process.env): boolean {
  const valor = (env.HYTO_MILE_REQUISITOS ?? "off").trim().toLowerCase();
  return valor === "on";
}

export function maxIntentosMile(env: EntornoMile = process.env): number {
  const crudo = Number((env.HYTO_MILE_INTENTOS ?? "").trim());
  if (!Number.isInteger(crudo) || crudo < 1 || crudo > 9) return INTENTOS_MILE_DEFECTO;
  return crudo;
}
