import type { MonedaTrabajo } from "./trabajo-dinero";
import { leerFechaTrabajo } from "./trabajo-fechas";
import type { ProgresoTrabajo } from "./trabajo-decision";

export type { MonedaTrabajo, ProgresoTrabajo };

/**
 * Full work transcription for Qwen. Not the live prompt in scout.ts.
 * Keep the place, the count, and the date as printed. Do not shorten to one sentence.
 * A printed amount such as 15.179,99 stays as printed. Do not rewrite it as dollars or as USDC.
 */
export const PEDIDO_TRABAJO_QWEN = [
  "Look at the photo and describe the work.",
  "Reply with JSON only, using these keys:",
  "texto: a full English paragraph that names the visible work, the place, any count of what was done, whether it is finished, partly done, or not started, and any date or time printed in the photo. Keep every one of those facts. Do not compress the paragraph into one short sentence.",
  "work: the work that is visible, or null.",
  "place: the place, or null.",
  "quantity_raw: the count of work done, as printed or as a digit, or null. Do not invent a count.",
  "progress: finished, partial, not_started, or null.",
  "date_raw: the date exactly as printed, including DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD, or a month name. Null if there is no date. Do not swap the day and the month.",
  "time_raw: the time exactly as printed, or null.",
  "amount_raw: a printed amount exactly as shown, keeping separators such as 15.179,99. Null if the photo shows no amount. Do not drop the separators. Do not convert colones to dollars or to USDC.",
  "currency: CRC, USD, USDC, or null. Copy the currency that is printed. Never rewrite CRC as USD or as USDC.",
].join(" ");

export const CLAVES_TRABAJO_QWEN = [
  "texto",
  "work",
  "place",
  "quantity_raw",
  "progress",
  "date_raw",
  "time_raw",
  "amount_raw",
  "currency",
] as const;

export type ExtraccionTrabajo = {
  texto: string;
  work: string | null;
  place: string | null;
  quantityRaw: string | null;
  progress: ProgresoTrabajo | null;
  dateRaw: string | null;
  /** Set only when the printed date has one reading. An ambiguous date stays null here. */
  dateIso: string | null;
  timeRaw: string | null;
  /** Printed amount, separators included. Never a converted figure. */
  amountRaw: string | null;
  currency: MonedaTrabajo | null;
};

export function leerExtraccionTrabajo(texto: string): ExtraccionTrabajo | null {
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
  const lectura = leerFechaTrabajo(dateRaw ?? cadena(crudo.date_iso) ?? "");
  return {
    texto: frase,
    work: cadena(crudo.work),
    place: cadena(crudo.place),
    quantityRaw: cadena(crudo.quantity_raw),
    progress: progresoDe(crudo.progress),
    dateRaw,
    dateIso: lectura.ambigua ? null : lectura.elegida,
    timeRaw: cadena(crudo.time_raw),
    amountRaw: cadena(crudo.amount_raw),
    currency: monedaModelo(crudo.currency),
  };
}

function cadena(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio || null;
}

function progresoDe(valor: unknown): ProgresoTrabajo | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toLowerCase();
  if (limpio === "terminado" || limpio === "finished") return "terminado";
  if (limpio === "parcial" || limpio === "partial") return "parcial";
  if (limpio === "sin_empezar" || limpio === "not_started") return "sin_empezar";
  return null;
}

function monedaModelo(valor: unknown): MonedaTrabajo | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toUpperCase();
  if (limpio === "CRC" || limpio === "USD" || limpio === "USDC") return limpio;
  return null;
}
