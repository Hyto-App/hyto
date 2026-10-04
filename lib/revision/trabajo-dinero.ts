export type MonedaTrabajo = "CRC" | "USD" | "USDC";

export type LecturaDinero = {
  /** Canonical amount such as "15179.99". Null when the separators are ambiguous. */
  valor: string | null;
  /** Same number as valor. Null when valor is null. Not a Stellar stroop count. */
  cantidad: number | null;
  /** From ₡, $, CRC, USD, or USDC only. Null when the text names no currency or names two. */
  moneda: MonedaTrabajo | null;
  ambigua: boolean;
  /** Both readings when the separators can mean two amounts. Otherwise one string, or empty. */
  interpretaciones: string[];
  /** "separador_ambiguo", "moneda_ambigua", or both. Null when the amount is clear. */
  marca: string | null;
};

/**
 * Reads a printed amount as a full number.
 * This is not normalizarMonto and not leerMontoRecibo. It must not feed the escrow.
 * Stellar asset amounts use seven decimal places; this value is not scaled and not converted.
 *
 * - 15.179,99 and 15,179.99 are both 15179.99.
 * - 15.179, a dot grouping thousands, is 15179.00.
 * - 15,18, a comma with one or two decimals, is 15.18.
 * - 1,234 can be 1234.00 or 1.234. Both are returned, valor stays null, marca is separador_ambiguo.
 * Currency is copied from the symbol or the code. CRC is not turned into USD or USDC.
 */
export function leerDineroTrabajo(valor: string): LecturaDinero | null {
  const original = valor.trim();
  if (!original) return null;
  const nucleo = original.replace(/[\s\u00a0\u202f]/g, "").replace(/[^\d.,]/g, "");
  if (!/\d/.test(nucleo)) return null;
  const partes = partir(nucleo);
  if (!partes) {
    return {
      valor: null,
      cantidad: null,
      moneda: null,
      ambigua: false,
      interpretaciones: [],
      marca: "no_reconocido",
    };
  }
  const monedas = monedasDe(original);
  const moneda = monedas.length === 1 ? (monedas[0] ?? null) : null;
  const marcas: string[] = [];
  if (partes.ambigua) marcas.push("separador_ambiguo");
  if (monedas.length > 1) marcas.push("moneda_ambigua");
  const ambigua = marcas.length > 0;
  return {
    valor: partes.ambigua ? null : partes.valor,
    cantidad: partes.ambigua || partes.valor === null ? null : Number(partes.valor),
    moneda,
    ambigua,
    interpretaciones: partes.interpretaciones,
    marca: marcas.length > 0 ? marcas.join(" ") : null,
  };
}

function monedasDe(texto: string): MonedaTrabajo[] {
  const encontradas: MonedaTrabajo[] = [];
  if (/₡/.test(texto) || /\bCRC\b/i.test(texto) || /\bcol[oó]n(?:es)?\b/i.test(texto)) encontradas.push("CRC");
  if (/\bUSDC\b/i.test(texto)) encontradas.push("USDC");
  if (/\$/.test(texto) || /\bUSD\b/i.test(texto) || /\bdollars?\b/i.test(texto)) encontradas.push("USD");
  return encontradas;
}

function partir(nucleo: string): { valor: string | null; interpretaciones: string[]; ambigua: boolean } | null {
  const crcDec = /^(\d{1,3}(?:\.\d{3})+),(\d{1,2})$/.exec(nucleo);
  if (crcDec) return claro(textoDe(crcDec[1].replaceAll(".", ""), crcDec[2] ?? ""));
  const usDec = /^(\d{1,3}(?:,\d{3})+)\.(\d{1,2})$/.exec(nucleo);
  if (usDec) return claro(textoDe(usDec[1].replaceAll(",", ""), usDec[2] ?? ""));
  const puntoMiles = /^(\d{1,3}(?:\.\d{3})+)$/.exec(nucleo);
  if (puntoMiles) return claro(textoDe(puntoMiles[1].replaceAll(".", ""), ""));
  const comaAmbigua = /^(\d{1,3}),(\d{3})$/.exec(nucleo);
  if (comaAmbigua) {
    const miles = textoDe((comaAmbigua[1] ?? "") + (comaAmbigua[2] ?? ""), "");
    const decimal = `${Number(comaAmbigua[1])}.${comaAmbigua[2]}`;
    if (!miles) return null;
    return { valor: null, interpretaciones: [miles, decimal], ambigua: true };
  }
  const comaMiles = /^(\d{1,3}(?:,\d{3}){2,})$/.exec(nucleo);
  if (comaMiles) return claro(textoDe(comaMiles[1].replaceAll(",", ""), ""));
  const coma = /^(\d+),(\d{1,2})$/.exec(nucleo);
  if (coma) return claro(textoDe(coma[1] ?? "", coma[2] ?? ""));
  const punto = /^(\d+)\.(\d{1,2})$/.exec(nucleo);
  if (punto) return claro(textoDe(punto[1] ?? "", punto[2] ?? ""));
  const entero = /^(\d+)$/.exec(nucleo);
  if (entero) return claro(textoDe(entero[1] ?? "", ""));
  return null;
}

function claro(valor: string | null): { valor: string | null; interpretaciones: string[]; ambigua: boolean } | null {
  if (!valor) return null;
  return { valor, interpretaciones: [valor], ambigua: false };
}

function textoDe(entero: string, fraccion: string): string | null {
  if (!/^\d+$/.test(entero)) return null;
  if (entero.length > 1 && entero.startsWith("0")) return null;
  const frac = (fraccion + "00").slice(0, 2);
  const centavos = Number(entero) * 100 + Number(frac);
  if (!Number.isSafeInteger(centavos)) return null;
  return `${Number(entero)}.${frac}`;
}
