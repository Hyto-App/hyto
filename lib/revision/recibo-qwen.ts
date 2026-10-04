import { leerFechaRecibo, type MonedaRecibo } from "./recibo-parser";

export type { MonedaRecibo };

/**
 * Full receipt transcription for Qwen. Not the live prompt in scout.ts.
 * amount_raw stays as printed. Colones are not rewritten as USD or as USDC.
 */
export const PEDIDO_RECIBO_QWEN = [
  "Look at the photo and transcribe the receipt.",
  "Reply with JSON only, using these keys:",
  "texto: a full English paragraph that names the merchant, the item bought, the total as printed, the currency, and the purchase date. Keep every one of those facts. Do not compress the paragraph.",
  "merchant: the store or brand, or null.",
  "item: one purchased product, or null.",
  "amount_raw: the total exactly as printed, keeping separators such as 15.179,99. Leave colones as colones. Do not drop the separators. Null if there is no total.",
  "currency: CRC, USD, or null. CRC means Costa Rican colones. Never output USDC. Never rewrite a CRC total as USD.",
  "date_raw: the purchase date exactly as printed, including DD/MM/YYYY. Null if there is no date.",
  "date_iso: that same date as YYYY-MM-DD, or null. Read DD/MM/YYYY as day, month, then year. 02/10/2026 is 2026-10-02. Do not swap the day and the month.",
].join(" ");

export const CLAVES_RECIBO_QWEN = ["texto", "merchant", "item", "amount_raw", "currency", "date_raw", "date_iso"] as const;

export type ExtraccionRecibo = {
  texto: string;
  merchant: string | null;
  item: string | null;
  /** Printed total, separators included. Never a converted dollar figure. */
  amountRaw: string | null;
  currency: MonedaRecibo | null;
  dateRaw: string | null;
  dateIso: string | null;
};

export function leerExtraccionRecibo(texto: string): ExtraccionRecibo | null {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) return null;
  let json: unknown;
  try {
    json = JSON.parse(texto.slice(inicio, fin + 1));
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;
  const crudo = json as Record<string, unknown>;
  const frase = typeof crudo.texto === "string" ? crudo.texto.trim() : "";
  if (!frase) return null;
  const dateRaw = cadena(crudo.date_raw);
  const dateIso = leerFechaRecibo(cadena(crudo.date_iso) ?? "") ?? (dateRaw ? leerFechaRecibo(dateRaw) : null);
  return {
    texto: frase,
    merchant: cadena(crudo.merchant),
    item: cadena(crudo.item),
    amountRaw: cadena(crudo.amount_raw),
    currency: monedaModelo(crudo.currency),
    dateRaw,
    dateIso,
  };
}

function cadena(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio || null;
}

function monedaModelo(valor: unknown): MonedaRecibo | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toUpperCase();
  if (limpio === "CRC" || limpio === "USD") return limpio;
  return null;
}
