/**
 * Receipt reading is off unless HYTO_RECIBO_CLARO is exactly "on".
 * The live review, escrow, and the 40 cap do not read this.
 * Unset, empty, and "off" all stay off.
 */
export const HYTO_RECIBO_CLARO = "HYTO_RECIBO_CLARO";

export function reciboClaroActivo(env: { HYTO_RECIBO_CLARO?: string } = process.env): boolean {
  const valor = (env.HYTO_RECIBO_CLARO ?? "off").trim().toLowerCase();
  return valor === "on";
}
