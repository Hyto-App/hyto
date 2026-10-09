import { normalizarMonto, textoMonto } from "@/lib/admin/vista";
import { convertirAUsd } from "./divisas";
import type { CoincideGroq } from "./otra-groq";
import { leerMontoRecibo } from "./recibo-parser";
import { leerFechaTrabajo } from "./trabajo-fechas";

export type TipoLectura = "recibo" | "trabajo" | "otra";

/**
 * What the vision model read from the photo, after Hyto checked it.
 * The model never converts money: montoUsd comes from UNIDADES_POR_USD in divisas.ts.
 */
export type LecturaEvidencia = {
  tipo: TipoLectura | null;
  /** ISO 3166 two-letter code, such as "CR". */
  pais: string | null;
  /** ISO 4217 code. Null when the photo does not show it. Never assumed to be USD. */
  moneda: string | null;
  /** The total exactly as printed, such as "₡7.950,00". */
  montoOriginal: string | null;
  /** US dollars, same format as normalizarMonto. Null when the currency is unknown or has no rate. */
  montoUsd: string | null;
  /** Units of `moneda` per 1 USD used for montoUsd. */
  tasa: number | null;
  /** YYYY-MM-DD. */
  fecha: string | null;
  /** The date as printed, such as "02/10/2026". */
  fechaImpresa: string | null;
  comercio: string | null;
  articulos: string[];
  textoCompleto: string;
  /** False when the model says the photo is blurry, dark, or cut off. */
  legible: boolean | null;
  faltantes: string[];
  /**
   * Whether the photo meets the organizer's rules. Null when there were no rules or the photo
   * does not show enough. Absent on readings stored before this field existed.
   */
  cumpleReglas?: boolean | null;
  /**
   * Whether the photo matches the request, as Groq stated it.
   * Null when the model did not send si, parcial, or no. Absent on readings stored
   * before HYTO_MILE_OTRA_CON_GROQ. The prompt asks for it only while that switch is on.
   */
  coincide?: CoincideGroq | null;
};

/** Keys the vision model must return. */
export const CLAVES_LECTURA = [
  "tipo",
  "pais",
  "moneda",
  "monto_original",
  "monto_usd",
  "fecha",
  "comercio",
  "articulos",
  "texto_completo",
  "legible",
  "faltantes",
] as const;

const MAX_TEXTO = 1500;
const MAX_CAMPO = 80;
const MAX_LISTA = 12;

/** "$" alone means US dollars in these countries. Anywhere else it is not enough to name the currency. */
const PAISES_DOLAR = new Set(["US", "CR", "PA", "EC", "SV", "PR"]);

/** Codes found inside a longer answer such as "Colones (CRC)". USDC is not a currency code here. */
const CODIGOS_ISO = new Set([
  "USD",
  "CRC",
  "EUR",
  "MXN",
  "GBP",
  "CAD",
  "COP",
  "PEN",
  "CLP",
  "ARS",
  "BRL",
  "GTQ",
  "HNL",
  "NIO",
  "PAB",
  "DOP",
  "UYU",
  "BOB",
  "PYG",
  "JPY",
  "CNY",
]);

const PAISES: Record<string, string> = {
  "costa rica": "CR",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  "estados unidos": "US",
};

const NOMBRE_MONEDA: Record<string, string> = {
  CRC: "Costa Rican colones",
  USD: "US dollars",
};

/** Null when the reply is not the structured shape (no texto_completo). */
export function leerLectura(crudo: Record<string, unknown>, contexto: { pedido?: string | null } = {}): LecturaEvidencia | null {
  const textoCompleto = recortar(cadena(crudo.texto_completo), MAX_TEXTO);
  if (!textoCompleto) return null;
  const pais = paisDe(crudo.pais);
  const montoOriginal = recortar(textoDe(crudo.monto_original), MAX_CAMPO);
  const moneda = monedaDe(crudo.moneda, montoOriginal, textoCompleto, pais);
  const usd = usdDe(montoOriginal, moneda, crudo.monto_usd);
  const fechaImpresa = recortar(textoDe(crudo.fecha), MAX_CAMPO);
  return {
    tipo: tipoDe(crudo.tipo),
    pais,
    moneda,
    montoOriginal,
    montoUsd: usd?.usd ?? null,
    tasa: usd?.tasa ?? null,
    fecha: fechaImpresa ? fechaDe(fechaImpresa, contexto.pedido ?? null, pais) : null,
    fechaImpresa,
    comercio: recortar(cadena(crudo.comercio), MAX_CAMPO),
    articulos: lista(crudo.articulos),
    textoCompleto,
    legible: siNo(crudo.legible),
    faltantes: lista(crudo.faltantes),
    cumpleReglas: siNo(crudo.cumple_reglas),
    coincide: coincideDe(crudo.coincide ?? crudo.coincidencia),
  };
}

/** A printed total that Hyto could not turn into US dollars. */
export function montoSinUsd(lectura: LecturaEvidencia | null | undefined): boolean {
  return Boolean(lectura?.montoOriginal && montoImpreso(lectura.montoOriginal) && !lectura.montoUsd);
}

/** The full reading Laya scores. Laya only sees text, so every field is written out. */
export function contextoParaLaya(lectura: LecturaEvidencia): string {
  const lineas = [`Evidence type: ${textoTipo(lectura.tipo)}.`, `Readable photo: ${textoLegible(lectura.legible)}.`];
  const recibo = lectura.tipo === "recibo" || (lectura.tipo !== "trabajo" && Boolean(lectura.montoOriginal || lectura.fechaImpresa));
  if (recibo) {
    lineas.push(`Merchant: ${lectura.comercio ?? "not shown"}.`);
    lineas.push(`Items: ${lectura.articulos.length > 0 ? lectura.articulos.join(", ") : "none named"}.`);
    lineas.push(`Total as printed: ${lectura.montoOriginal ?? "not shown"}.`);
    lineas.push(`Currency: ${textoMoneda(lectura)}.`);
    if (lectura.montoUsd) lineas.push(`Total in US dollars: ${lectura.montoUsd}${textoTasa(lectura)}.`);
    lineas.push(`Purchase date: ${textoFecha(lectura)}.`);
  } else if (lectura.articulos.length > 0) {
    lineas.push(`Visible objects: ${lectura.articulos.join(", ")}.`);
  }
  if (lectura.pais) lineas.push(`Country: ${lectura.pais}.`);
  lineas.push(`Missing from the photo: ${lectura.faltantes.length > 0 ? lectura.faltantes.join("; ") : "none"}.`);
  if (lectura.cumpleReglas === true) lineas.push("Organizer rules: the description says the photo meets them.");
  if (lectura.cumpleReglas === false) lineas.push("Organizer rules: the description says the photo breaks at least one.");
  lineas.push(`Description: ${lectura.textoCompleto}`);
  return lineas.join("\n");
}

/** Stored after the description in texto_scout. texto_completo is that description, so it is not repeated. */
export function escribirLectura(lectura: LecturaEvidencia): string {
  return JSON.stringify({
    tipo: lectura.tipo,
    pais: lectura.pais,
    moneda: lectura.moneda,
    monto_original: lectura.montoOriginal,
    monto_usd: lectura.montoUsd,
    tasa: lectura.tasa,
    fecha: lectura.fecha,
    fecha_impresa: lectura.fechaImpresa,
    comercio: lectura.comercio,
    articulos: lectura.articulos,
    legible: lectura.legible,
    faltantes: lectura.faltantes,
    cumple_reglas: lectura.cumpleReglas ?? null,
    ...(lectura.coincide ? { coincide: lectura.coincide } : {}),
  });
}

/** Reads what escribirLectura stored. Stored values win, so a later rate change does not rewrite an old review. */
export function leerLecturaGuardada(crudo: string, textoCompleto: string): LecturaEvidencia | null {
  let json: unknown;
  try {
    json = JSON.parse(crudo.trim());
  } catch {
    return null;
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const valor = json as Record<string, unknown>;
  const tasa = typeof valor.tasa === "number" && Number.isFinite(valor.tasa) && valor.tasa > 0 ? valor.tasa : null;
  return {
    tipo: tipoDe(valor.tipo),
    pais: paisDe(valor.pais),
    moneda: codigoMoneda(valor.moneda),
    montoOriginal: recortar(textoDe(valor.monto_original), MAX_CAMPO),
    montoUsd: typeof valor.monto_usd === "string" ? normalizarMonto(valor.monto_usd) : null,
    tasa,
    fecha: typeof valor.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor.fecha) ? valor.fecha : null,
    fechaImpresa: recortar(textoDe(valor.fecha_impresa), MAX_CAMPO),
    comercio: recortar(cadena(valor.comercio), MAX_CAMPO),
    articulos: lista(valor.articulos),
    textoCompleto: textoCompleto.trim(),
    legible: siNo(valor.legible),
    faltantes: lista(valor.faltantes),
    cumpleReglas: siNo(valor.cumple_reglas),
    coincide: coincideDe(valor.coincide),
  };
}

function montoImpreso(impreso: string | null): { centavos: number } | null {
  if (!impreso) return null;
  const entero = leerMontoRecibo(impreso);
  if (entero && entero.centavos > 0) return entero;
  for (const trozo of impreso.match(/\d[\d.,\s\u00a0\u202f]*\d|\d/g) ?? []) {
    const leido = leerMontoRecibo(trozo);
    if (leido && leido.centavos > 0) return leido;
  }
  return null;
}

function usdDe(impreso: string | null, moneda: string | null, usdModelo: unknown): { usd: string; tasa: number } | null {
  const leido = montoImpreso(impreso);
  if (moneda === "USD") {
    if (leido) return { usd: textoMonto(leido.centavos), tasa: 1 };
    const modelo = typeof usdModelo === "number" ? normalizarMonto(String(usdModelo)) : typeof usdModelo === "string" ? normalizarMonto(usdModelo.replace(/^\s*(?:US)?\$\s*/i, "")) : null;
    return modelo ? { usd: modelo, tasa: 1 } : null;
  }
  if (!leido || !moneda) return null;
  return convertirAUsd(leido.centavos, moneda);
}

type Marca = "CRC" | "USD" | "dolar" | "conflicto" | null;

function marcaMoneda(texto: string): Marca {
  const colones = /[₡¢]/.test(texto) || /\bCRC\b/i.test(texto) || /\bcol[oó]n(?:es)?\b/i.test(texto);
  const dolares = /\bUS\s?\$|\bUSD\b|\bU\.S\. dollars?\b|\bUS dollars?\b|\bd[oó]lares\b|\bdollars?\b/i.test(texto);
  if (colones && dolares) return "conflicto";
  if (colones) return "CRC";
  if (dolares) return "USD";
  if (/\$/.test(texto)) return "dolar";
  return null;
}

/**
 * The printed symbol wins over the model's code. A bare "$" names US dollars only where that is the
 * local meaning. With nothing to go on, the currency stays null. It is never assumed to be USD.
 */
function monedaDe(declarada: unknown, impreso: string | null, texto: string, pais: string | null): string | null {
  const enTotal = marcaMoneda(impreso ?? "");
  const modelo = codigoMoneda(declarada);
  if (enTotal === "conflicto") return null;
  if (enTotal === "CRC" || enTotal === "USD") return enTotal;
  if (enTotal === "dolar") {
    if (modelo && modelo !== "CRC") return modelo;
    return pais && PAISES_DOLAR.has(pais) ? "USD" : null;
  }
  if (modelo) return modelo;
  const enTexto = marcaMoneda(texto);
  if (enTexto === "CRC" || enTexto === "USD") return enTexto;
  return null;
}

function codigoMoneda(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!limpio) return null;
  const marca = marcaMoneda(limpio);
  if (marca === "CRC" || marca === "USD") return marca;
  if (marca === "conflicto") return null;
  for (const token of limpio.toUpperCase().match(/[A-Z]{3,}/g) ?? []) {
    if (CODIGOS_ISO.has(token)) return token;
  }
  const codigo = limpio.toUpperCase();
  return /^[A-Z]{3}$/.test(codigo) ? codigo : null;
}

function fechaDe(impresa: string, pedido: string | null, pais: string | null): string | null {
  const conAnio = impresa.replace(/(?<!\d)(\d{1,2})([/.-])(\d{1,2})\2(\d{2})(?!\d)/g, (_, dia, separador, mes, anio) => {
    return `${dia}${separador}${mes}${separador}20${anio}`;
  });
  return leerFechaTrabajo(conAnio, { pedido, locale: pais === "US" ? "en-US" : "es-CR" }).elegida;
}

/**
 * An explicit coincide assignment outside the parsed object, such as a line the model
 * added after the JSON. Prose that merely discusses the photo is not a value.
 */
export function coincideMencionado(texto: string): CoincideGroq | null {
  const marcado = texto.match(/["']coincide["']\s*:\s*["']([^"']+)["']/i);
  if (marcado?.[1]) return coincideDe(marcado[1]);
  // í is not a word character, so the boundary is checked after accents are folded.
  const plano = texto.normalize("NFD").replace(/\p{M}/gu, "");
  const suelto = plano.match(/\bcoincide\s*[:=]\s*["']?(si|yes|parcial|partial|no)\b/i);
  return suelto?.[1] ? coincideDe(suelto[1]) : null;
}

/** si / parcial / no. Anything else, including an old reading with no key, is null. */
function coincideDe(valor: unknown): CoincideGroq | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().toLowerCase().replace("í", "i");
  if (limpio === "si" || limpio === "yes") return "si";
  if (limpio === "parcial" || limpio === "partial") return "parcial";
  if (limpio === "no") return "no";
  return null;
}

function tipoDe(valor: unknown): TipoLectura | null {
  const limpio = typeof valor === "string" ? valor.trim().toLowerCase() : "";
  if (["recibo", "factura", "receipt", "invoice"].includes(limpio)) return "recibo";
  if (["trabajo", "work", "escena", "scene"].includes(limpio)) return "trabajo";
  if (["otra", "otro", "other"].includes(limpio)) return "otra";
  return null;
}

function paisDe(valor: unknown): string | null {
  const limpio = typeof valor === "string" ? valor.trim() : "";
  if (/^[A-Za-z]{2}$/.test(limpio)) return limpio.toUpperCase();
  return PAISES[limpio.toLowerCase()] ?? null;
}

function siNo(valor: unknown): boolean | null {
  if (typeof valor === "boolean") return valor;
  const limpio = typeof valor === "string" ? valor.trim().toLowerCase() : "";
  if (["true", "yes", "si", "sí"].includes(limpio)) return true;
  if (["false", "no"].includes(limpio)) return false;
  return null;
}

function lista(valor: unknown): string[] {
  const crudos = Array.isArray(valor) ? valor : typeof valor === "string" ? valor.split(/[;,\n]/) : [];
  const salida: string[] = [];
  for (const crudo of crudos) {
    const limpio = recortar(textoDe(crudo), MAX_CAMPO);
    if (limpio && !salida.includes(limpio)) salida.push(limpio);
    if (salida.length >= MAX_LISTA) break;
  }
  return salida;
}

function textoDe(valor: unknown): string | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  return cadena(valor);
}

function cadena(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.replace(/\s+/g, " ").trim();
  if (!limpio || /^(?:null|none|n\/a)$/i.test(limpio)) return null;
  return limpio;
}

function recortar(valor: string | null, maximo: number): string | null {
  if (!valor) return null;
  return valor.length > maximo ? `${valor.slice(0, maximo - 1).trimEnd()}…` : valor;
}

function textoTipo(tipo: TipoLectura | null): string {
  if (tipo === "recibo") return "a receipt or an invoice";
  if (tipo === "trabajo") return "work, a place, or a scene the organizer asked to see";
  if (tipo === "otra") return "something other than the requested work or a receipt";
  return "not stated";
}

function textoLegible(legible: boolean | null): string {
  if (legible === null) return "not stated";
  return legible ? "yes" : "no, it is blurry, dark, or cut off";
}

function textoMoneda(lectura: LecturaEvidencia): string {
  if (!lectura.moneda) return "not shown, so the total was not converted to US dollars";
  const nombre = NOMBRE_MONEDA[lectura.moneda];
  return nombre ? `${lectura.moneda} (${nombre})` : lectura.moneda;
}

function textoTasa(lectura: LecturaEvidencia): string {
  if (!lectura.moneda || lectura.moneda === "USD" || !lectura.tasa) return "";
  return `, converted by Hyto at ${lectura.tasa} ${lectura.moneda} per US dollar`;
}

function textoFecha(lectura: LecturaEvidencia): string {
  if (!lectura.fecha) return lectura.fechaImpresa ? `unclear (printed as ${lectura.fechaImpresa})` : "not shown";
  if (lectura.fechaImpresa && lectura.fechaImpresa !== lectura.fecha) return `${lectura.fecha} (printed as ${lectura.fechaImpresa})`;
  return lectura.fecha;
}
