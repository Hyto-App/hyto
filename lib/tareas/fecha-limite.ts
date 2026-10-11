/**
 * Due dates («¿Para cuándo?»): today or later, and not absurdly far.
 * The browser checks against the person's own calendar day. The server cannot know that day,
 * so it allows one day of slack on each side of UTC (every time zone sits within UTC−12…UTC+14).
 */

export const ANIOS_MAXIMOS = 5;

/** API answers. `lib/ui/claro.ts` shows them in the session language. */
export const AVISO_FECHA_FORMATO = "The project date has to be a day like 2026-10-16.";
export const AVISO_FECHA_PASADA = "Choose a date from today onward.";
export const AVISO_FECHA_LEJANA = "Choose a date within the next 5 years.";

export type ProblemaFecha = "formato" | "pasada" | "lejana";

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Reads YYYY-MM-DD as a real calendar day. `2026-02-30` is not one. */
export function diaValido(valor: string): { anio: number; mes: number; dia: number } | null {
  const partes = FORMATO.exec(valor);
  if (!partes) return null;
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return { anio, mes, dia };
}

function dosDigitos(numero: number): string {
  return String(numero).padStart(2, "0");
}

function aTexto(anio: number, mes: number, dia: number): string {
  return `${String(anio).padStart(4, "0")}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

/** The person's own calendar day, from the browser clock and time zone. */
export function hoyLocal(ahora: Date = new Date()): string {
  return aTexto(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate());
}

/** Moves a YYYY-MM-DD by whole days and years. 29 February plus a year lands on 28 February. */
export function moverDia(valor: string, cambio: { dias?: number; anios?: number }): string {
  const leido = diaValido(valor);
  if (!leido) return valor;
  const anio = leido.anio + (cambio.anios ?? 0);
  const ultimo = new Date(Date.UTC(anio, leido.mes, 0)).getUTCDate();
  const base = new Date(Date.UTC(anio, leido.mes - 1, Math.min(leido.dia, ultimo)));
  base.setUTCDate(base.getUTCDate() + (cambio.dias ?? 0));
  return aTexto(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
}

/** `min` and `max` for `<input type="date">`: today through today plus five years. */
export function rangoFecha(ahora: Date = new Date()): { min: string; max: string } {
  const min = hoyLocal(ahora);
  return { min, max: moverDia(min, { anios: ANIOS_MAXIMOS }) };
}

/** Compares YYYY-MM-DD strings. Both are already zero-padded, so text order is date order. */
export function problemaFecha(valor: string, rango: { min: string; max: string }): ProblemaFecha | null {
  const limpio = valor.trim();
  if (!diaValido(limpio)) return "formato";
  if (limpio < rango.min) return "pasada";
  if (limpio > rango.max) return "lejana";
  return null;
}

/** Browser check against the person's own today. Empty means no date, which is allowed. */
export function problemaFechaLocal(valor: string, ahora: Date = new Date()): ProblemaFecha | null {
  if (!valor.trim()) return null;
  return problemaFecha(valor, rangoFecha(ahora));
}

/** Server range: the UTC day minus one through the UTC day plus five years plus one. */
export function rangoServidor(ahora: Date = new Date()): { min: string; max: string } {
  const hoyUtc = ahora.toISOString().slice(0, 10);
  return { min: moverDia(hoyUtc, { dias: -1 }), max: moverDia(hoyUtc, { anios: ANIOS_MAXIMOS, dias: 1 }) };
}

/** For screens that show a stored date. Old and past dates still show; a broken value shows nothing instead of throwing. */
export function fechaGuardadaVisible(valor: string | null | undefined, idioma: "en" | "es", formato: Intl.DateTimeFormatOptions): string | null {
  const limpio = valor?.trim() ?? "";
  if (!diaValido(limpio)) return null;
  try {
    return new Intl.DateTimeFormat(idioma === "es" ? "es-CR" : "en-US", { ...formato, timeZone: "UTC" }).format(new Date(`${limpio}T00:00:00Z`));
  } catch {
    return null;
  }
}

/**
 * The date as the person reads it: day first in Spanish (16/10/2026), month first in English (10/16/2026).
 * Native date inputs follow the browser's locale, not Hyto's language, so the field shows this text instead.
 */
export function fechaATexto(valor: string, idioma: "en" | "es"): string {
  const leido = diaValido(valor.trim());
  if (!leido) return "";
  const dia = dosDigitos(leido.dia);
  const mes = dosDigitos(leido.mes);
  return idioma === "es" ? `${dia}/${mes}/${leido.anio}` : `${mes}/${dia}/${leido.anio}`;
}

/** Reads what was typed: dd/mm/aaaa in Spanish, mm/dd/yyyy in English, eight digits, or YYYY-MM-DD. Null when it is not a real day. */
export function textoAFecha(texto: string, idioma: "en" | "es"): string | null {
  const limpio = texto.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(limpio);
  if (iso) {
    const valor = aTexto(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return diaValido(valor) ? valor : null;
  }
  const partes = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/.exec(limpio) ?? /^(\d{2})(\d{2})(\d{4})$/.exec(limpio);
  if (!partes) return null;
  const [primero, segundo] = [Number(partes[1]), Number(partes[2])];
  const valor = idioma === "es" ? aTexto(Number(partes[3]), segundo, primero) : aTexto(Number(partes[3]), primero, segundo);
  return diaValido(valor) ? valor : null;
}

/** While typing only digits, adds the slashes: 16102026 → 16/10/2026. Anything else is left as typed. */
export function enmascararFecha(texto: string): string {
  if (!/^[\d/]*$/.test(texto)) return texto;
  const digitos = texto.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return texto.endsWith("/") && digitos.length === 2 ? `${digitos}/` : digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}
