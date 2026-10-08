import { textoMonto } from "@/lib/admin/vista";

/**
 * Colones per US dollar used only when the public rate cannot be read.
 * Labeled fallback, last set by hand on 2026-10-04. Do not treat it as a live quote.
 */
export const CRC_POR_USD = 505;
export const FECHA_TASA_RESPALDO = "2026-10-04";

/** Costa Rican Treasury feed of the BCCR dollar reference rate. No API key. */
export const URL_TASA_HACIENDA = "https://api.hacienda.go.cr/indicadores/tc/dolar";

const TTL_OK_MS = 6 * 60 * 60 * 1000;
const TTL_FALLO_MS = 15 * 60 * 1000;
const MIN_TASA = 100;
const MAX_TASA = 2_000;

export type FuenteTasa = "hacienda" | "respaldo";

export type TasaCrc = {
  colonesPorUsd: number;
  fuente: FuenteTasa;
  /** Day the reference rate was published. Null for the labeled fallback. */
  fecha: string | null;
};

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

type CacheTasa = { hasta: number; tasa: TasaCrc };
let cache: CacheTasa | null = null;

export function tasaRespaldo(): TasaCrc {
  return { colonesPorUsd: CRC_POR_USD, fuente: "respaldo", fecha: null };
}

export function reiniciarTasaCrc(): void {
  cache = null;
}

export type OpcionesTasa = {
  fetch?: typeof fetch;
  ahora?: number;
  /** Read the network even when the test runner would skip it. */
  forzarRed?: boolean;
};

/** Selling reference rate (colones per 1 USD), cached. The fallback is used when the feed fails. */
export async function tasaCrcVigente(opciones: OpcionesTasa = {}): Promise<TasaCrc> {
  const ahora = opciones.ahora ?? Date.now();
  if (cache && cache.hasta > ahora) return cache.tasa;
  if (!opciones.forzarRed && process.env.NODE_TEST_CONTEXT) return tasaRespaldo();
  const leida = await leerHacienda(opciones.fetch ?? fetch).catch(() => null);
  const tasa = leida ?? tasaRespaldo();
  cache = { hasta: ahora + (leida ? TTL_OK_MS : TTL_FALLO_MS), tasa };
  return tasa;
}

export function fraseFuenteTasa(fuente: FuenteTasa | null | undefined, fecha: string | null | undefined): string {
  if (fuente === "hacienda") {
    return fecha ? `Costa Rica reference selling rate for ${fecha}` : "Costa Rica reference selling rate";
  }
  if (fuente === "respaldo") return `fallback rate, last set by hand on ${FECHA_TASA_RESPALDO}`;
  return "";
}

/** Converts integer cents of `moneda` to USD. CRC uses `tasaCrc` when the caller already loaded one. */
export function convertirAUsd(centavos: number, moneda: string | null, tasaCrc: number = CRC_POR_USD): ConversionUsd | null {
  if (!moneda || !Number.isSafeInteger(centavos) || centavos <= 0) return null;
  const tasa = moneda === "CRC" ? tasaCrc : UNIDADES_POR_USD[moneda];
  if (!tasa || !Number.isFinite(tasa) || tasa <= 0) return null;
  const usd = Math.round(centavos / tasa);
  if (usd <= 0) return null;
  return { usd: textoMonto(usd), tasa };
}

async function leerHacienda(fetchImpl: typeof fetch): Promise<TasaCrc | null> {
  const respuesta = await fetchImpl(URL_TASA_HACIENDA, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(4_000),
    cache: "no-store",
  });
  if (!respuesta.ok) return null;
  const json = (await respuesta.json()) as { venta?: { fecha?: unknown; valor?: unknown } };
  const valor = numero(json.venta?.valor);
  const fecha = fechaDe(json.venta?.fecha);
  if (valor === null || valor < MIN_TASA || valor > MAX_TASA) return null;
  return { colonesPorUsd: valor, fuente: "hacienda", fecha };
}

function numero(valor: unknown): number | null {
  const tasa = typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor) : NaN;
  if (!Number.isFinite(tasa) || tasa <= 0) return null;
  return tasa;
}

function fechaDe(valor: unknown): string | null {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
}
