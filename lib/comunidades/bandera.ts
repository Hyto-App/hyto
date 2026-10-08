/**
 * Communities stay off unless HYTO_COMUNIDADES is exactly "on".
 * Unset, empty, and anything else keep the app as it is today.
 */
export const HYTO_COMUNIDADES = "HYTO_COMUNIDADES";

export type EntornoComunidades = {
  HYTO_COMUNIDADES?: string;
  [clave: string]: string | undefined;
};

export function comunidadesActivas(env: EntornoComunidades = process.env): boolean {
  const valor = (env.HYTO_COMUNIDADES ?? "off").trim().toLowerCase();
  return valor === "on";
}
