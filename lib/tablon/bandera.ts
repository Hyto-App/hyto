/**
 * The community bulletin stays off unless HYTO_TABLON is exactly "on".
 * Unset, empty, and anything else keep the app as it is today.
 */
export const HYTO_TABLON = "HYTO_TABLON";

export type EntornoTablon = {
  HYTO_TABLON?: string;
  [clave: string]: string | undefined;
};

export function tablonActivo(env: EntornoTablon = process.env): boolean {
  const valor = (env.HYTO_TABLON ?? "off").trim().toLowerCase();
  return valor === "on";
}
