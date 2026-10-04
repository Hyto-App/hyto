import { compararFechaPedido, leerFechaRecibo } from "./recibo-parser";

export const REGLA_UNICA = "unica";
export const REGLA_PEDIDO = "pedido";
/** Costa Rica writes the day first. 02/10/2026 is 2 October 2026 when this rule applies. */
export const REGLA_DIA_PRIMERO = "es-CR: DD/MM";
/** Month first. Used only when the caller passes locale en-US. */
export const REGLA_MES_PRIMERO = "en-US: MM/DD";

export type ReglaFecha =
  | typeof REGLA_UNICA
  | typeof REGLA_PEDIDO
  | typeof REGLA_DIA_PRIMERO
  | typeof REGLA_MES_PRIMERO;

export type LecturaFecha = {
  /** Every calendar date the text can mean, as YYYY-MM-DD. Day-first comes before month-first. */
  interpretaciones: string[];
  /** True when more than one calendar date fits. The other reading stays in interpretaciones. */
  ambigua: boolean;
  /** "ambigua" when ambigua is true. Null when the text has one date or none. */
  marca: "ambigua" | null;
  /**
   * The date selected by an explicit rule, or null when nothing fits.
   * A value here does not hide ambigua: both stay visible.
   */
  elegida: string | null;
  regla: ReglaFecha | null;
};

export type ContextoFecha = {
  pedido?: string | null;
  /**
   * Default es-CR (day first). en-US selects month first.
   * The request wins over the locale when it matches exactly one reading.
   */
  locale?: string | null;
};

const MESES: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  ago: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  dic: 12,
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const VACIA: LecturaFecha = {
  interpretaciones: [],
  ambigua: false,
  marca: null,
  elegida: null,
  regla: null,
};

/**
 * Reads a date in more than one order.
 *
 * Numeric orders: DD/MM/YYYY, MM/DD/YYYY, and YYYY/MM/DD (also YYYY-MM-DD).
 * Separators are / - . and a space. Month names in Spanish and English are one date.
 *
 * 02/10/2026 fits 2026-10-02 and 2026-02-10. Both are returned with marca "ambigua".
 * The chosen date follows this order, and the rule is stored:
 * 1. Only one valid calendar date: "unica".
 * 2. The request matches exactly one reading: "pedido".
 * 3. Otherwise the locale. Default es-CR means day first. en-US means month first.
 *
 * A missing year is not invented. leerFechaRecibo is used only to confirm a
 * YYYY-MM-DD value. It is not used on slash dates, because that function always
 * returns day-first and would drop the other reading.
 */
export function leerFechaTrabajo(valor: string, contexto: ContextoFecha = {}): LecturaFecha {
  const texto = valor.trim();
  if (!texto) return VACIA;
  const nombrada = fechaConNombre(texto);
  if (nombrada) {
    return { interpretaciones: [nombrada], ambigua: false, marca: null, elegida: nombrada, regla: REGLA_UNICA };
  }
  return elegir(fechasNumericas(texto), contexto);
}

/** Drops date and clock tokens so a later count does not treat 2 October as the number 2. */
export function quitarFechas(texto: string): string {
  let plano = sinAcento(texto);
  plano = plano.replace(/\b\d{1,2}:\d{2}\b/g, " ");
  plano = plano.replace(/\b\d{4}[/.\-\s]\d{1,2}[/.\-\s]\d{1,2}\b/g, " ");
  plano = plano.replace(/\b\d{1,2}[/.\-\s]\d{1,2}[/.\-\s]\d{4}\b/g, " ");
  plano = plano.replace(/\b\d{1,2}\s+de\s+[a-z]+\b(?:\s+de\s+\d{4}\b)?/g, (trozo) => {
    const mes = trozo.split(/\s+/)[2] ?? "";
    return mesDe(mes) ? " " : trozo;
  });
  plano = plano.replace(/\b[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?\b(?:,)?(?:\s+\d{4}\b)?/g, (trozo) => {
    const mes = trozo.split(/\s+/)[0] ?? "";
    return mesDe(mes) ? " " : trozo;
  });
  plano = plano.replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[a-z]+\b(?:\s+\d{4}\b)?/g, (trozo) => {
    const partes = trozo.split(/\s+/);
    const mes = partes[1] === "of" ? (partes[2] ?? "") : (partes[1] ?? "");
    return mesDe(mes) ? " " : trozo;
  });
  return plano;
}

function elegir(opciones: string[], contexto: ContextoFecha): LecturaFecha {
  const unicas = [...new Set(opciones)];
  if (unicas.length === 0) return VACIA;
  if (unicas.length === 1) {
    return { interpretaciones: unicas, ambigua: false, marca: null, elegida: unicas[0] ?? null, regla: REGLA_UNICA };
  }
  const pedido = contexto.pedido?.trim() ?? "";
  if (pedido) {
    const coinciden = unicas.filter((iso) => compararFechaPedido(pedido, iso) === "coincide");
    if (coinciden.length === 1) {
      return { interpretaciones: unicas, ambigua: true, marca: "ambigua", elegida: coinciden[0] ?? null, regla: REGLA_PEDIDO };
    }
  }
  if (unicas.length !== 2) {
    return { interpretaciones: unicas, ambigua: true, marca: "ambigua", elegida: null, regla: null };
  }
  const locale = (contexto.locale ?? "es-CR").trim().toLowerCase();
  const mesPrimero = locale === "en-us" || locale === "en";
  return {
    interpretaciones: unicas,
    ambigua: true,
    marca: "ambigua",
    elegida: mesPrimero ? (unicas[1] ?? null) : (unicas[0] ?? null),
    regla: mesPrimero ? REGLA_MES_PRIMERO : REGLA_DIA_PRIMERO,
  };
}

function fechasNumericas(texto: string): string[] {
  const salida: string[] = [];
  const patron = /(?<!\d)(\d{4}|\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4}|\d{1,2})(?!\d)/g;
  for (const match of texto.matchAll(patron)) {
    const aTexto = match[1] ?? "";
    const cTexto = match[3] ?? "";
    const a = Number(aTexto);
    const b = Number(match[2]);
    const c = Number(cTexto);
    if (aTexto.length === 4 && cTexto.length <= 2) {
      agregar(salida, isoSiValida(a, b, c));
      continue;
    }
    if (cTexto.length === 4 && aTexto.length <= 2) {
      agregar(salida, isoSiValida(c, b, a));
      agregar(salida, isoSiValida(c, a, b));
    }
  }
  return salida;
}

function agregar(salida: string[], iso: string | null): void {
  if (!iso || salida.includes(iso)) return;
  salida.push(iso);
}

function fechaConNombre(texto: string): string | null {
  const plano = sinAcento(texto);
  const lista: { index: number; iso: string }[] = [];
  const sumar = (index: number, dia: number, mes: number, anio: number | null) => {
    if (!anio) return;
    const iso = isoSiValida(anio, mes, dia);
    if (!iso) return;
    lista.push({ index, iso });
  };

  for (const match of plano.matchAll(/(\d{1,2})\s+de\s+([a-z]+)\b(?:\s+de\s+(\d{4})\b)?/g)) {
    const mes = mesDe(match[2] ?? "");
    if (!mes || match.index === undefined) continue;
    sumar(match.index, Number(match[1]), mes, match[3] ? Number(match[3]) : null);
  }
  for (const match of plano.matchAll(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,)?(?:\s+(\d{4})\b)?/g)) {
    const mes = mesDe(match[1] ?? "");
    if (!mes || match.index === undefined) continue;
    sumar(match.index, Number(match[2]), mes, match[3] ? Number(match[3]) : null);
  }
  for (const match of plano.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)\b(?:\s+(\d{4})\b)?/g)) {
    const mes = mesDe(match[2] ?? "");
    if (!mes || match.index === undefined) continue;
    sumar(match.index, Number(match[1]), mes, match[3] ? Number(match[3]) : null);
  }

  lista.sort((a, b) => a.index - b.index);
  return lista[0]?.iso ?? null;
}

function isoSiValida(anio: number, mes: number, dia: number): string | null {
  if (!fechaValida(anio, mes, dia)) return null;
  const iso = formatear(anio, mes, dia);
  return leerFechaRecibo(iso) === iso ? iso : null;
}

function mesDe(palabra: string): number | null {
  return MESES[palabra] ?? null;
}

function sinAcento(valor: string): string {
  return valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function fechaValida(anio: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1 || anio < 1000 || anio > 9999) return false;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

function formatear(anio: number, mes: number, dia: number): string {
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
