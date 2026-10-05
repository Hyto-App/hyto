import { textoMonto } from "@/lib/admin/vista";

/**
 * Colones per US dollar. There is no live exchange-rate call: update this
 * number by hand when the rate moves. Set on 2026-10-04.
 */
export const CRC_POR_USD = 505;

/** Units of each currency per 1 USD. A currency that is not listed is not converted. */
export const UNIDADES_POR_USD: Readonly<Record<string, number>> = {
  USD: 1,
  CRC: CRC_POR_USD,
};

export type ConversionUsd = {
  /** Same format as normalizarMonto, such as "15.74" or "15". */
  usd: string;
  /** Units of the source currency per 1 USD. 1 for USD. */
  tasa: number;
};

/** Converts integer cents of `moneda` to USD with the table above. Null when there is no rate. */
export function convertirAUsd(centavos: number, moneda: string | null): ConversionUsd | null {
  if (!moneda || !Number.isSafeInteger(centavos) || centavos <= 0) return null;
  const tasa = UNIDADES_POR_USD[moneda];
  if (!tasa || !Number.isFinite(tasa) || tasa <= 0) return null;
  const usd = Math.round(centavos / tasa);
  if (usd <= 0) return null;
  return { usd: textoMonto(usd), tasa };
}
