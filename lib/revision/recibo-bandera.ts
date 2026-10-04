/**
 * Receipt reading is off unless HYTO_RECIBO_CLARO is exactly "on".
 * The live review, escrow, and the 40 cap do not read this.
 * Unset, empty, and "off" all stay off.
 */
export const HYTO_RECIBO_CLARO = "HYTO_RECIBO_CLARO";

/** NODE_ENV is listed so this accepts process.env without turning the flag on. */
export type EntornoRecibo = {
  HYTO_RECIBO_CLARO?: string;
  NODE_ENV?: string;
};

export function reciboClaroActivo(env: EntornoRecibo = process.env): boolean {
  const valor = (env.HYTO_RECIBO_CLARO ?? "off").trim().toLowerCase();
  return valor === "on";
}
