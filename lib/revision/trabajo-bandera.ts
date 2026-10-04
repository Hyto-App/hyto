/**
 * Work reading is off unless HYTO_TRABAJO_CLARO is exactly "on".
 * The live review, escrow, grade caps, and payment do not read this.
 * Unset, empty, and "off" all stay off.
 */
export const HYTO_TRABAJO_CLARO = "HYTO_TRABAJO_CLARO";

/** NODE_ENV is listed so this accepts process.env without turning the flag on. */
export type EntornoTrabajo = {
  HYTO_TRABAJO_CLARO?: string;
  NODE_ENV?: string;
};

export function trabajoClaroActivo(env: EntornoTrabajo = process.env): boolean {
  const valor = (env.HYTO_TRABAJO_CLARO ?? "off").trim().toLowerCase();
  return valor === "on";
}
