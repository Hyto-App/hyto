/**
 * The work-photo ceiling stays as it is unless HYTO_MILE_TECHO_80 is exactly "on".
 * Unset, empty, and anything else keep v2 and t10 on the winning label alone.
 */
export const HYTO_MILE_TECHO_80 = "HYTO_MILE_TECHO_80";

export type EntornoTecho = {
  HYTO_MILE_TECHO_80?: string;
  [clave: string]: string | undefined;
};

export function mileTecho80Activo(env: EntornoTecho = process.env): boolean {
  const valor = (env.HYTO_MILE_TECHO_80 ?? "off").trim().toLowerCase();
  return valor === "on";
}
