import type { TipoTarea } from "@/lib/integrante/tipos";
import type { Descripcion } from "./armar";
import { contextoParaLaya, leerLectura, type LecturaEvidencia } from "./lectura";
import { compararFechaPedido, leerMontoRecibo } from "./recibo-parser";
import { leerFechaTrabajo } from "./trabajo-fechas";

/**
 * The vision path fills amount, date, merchant, and items from the model's JSON
 * (`leerLectura`). A PDF, HTML, or text file has no vision JSON: the same fields
 * are read from the transcription so Laya and the caps see them.
 */
export function estructurarTranscripcion(
  texto: string,
  contexto: { condicion?: string | null; tipoTarea?: TipoTarea | null } = {},
): Descripcion {
  const limpio = texto.trim();
  const lectura = lecturaDeTranscripcion(limpio, contexto.condicion ?? null);
  if (!lectura) return { texto: limpio, monto: null, fecha: null };
  const reembolso = contexto.tipoTarea === "reembolso" || lectura.tipo === "recibo";
  return {
    texto: limpio,
    monto: reembolso ? lectura.montoUsd : null,
    fecha: reembolso ? lectura.fecha : null,
    lectura,
  };
}

export function lecturaDeTranscripcion(texto: string, pedido: string | null = null): LecturaEvidencia | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const fechaImpresa = fechaImpresaDe(limpio);
  const total = totalDe(limpio);
  const comercio = comercioDe(limpio);
  const articulos = articulosDe(limpio, comercio);
  if (!fechaImpresa && !total) return null;
  return leerLectura(
    {
      tipo: "recibo",
      pais: null,
      moneda: total?.moneda ?? null,
      monto_original: total?.impreso ?? null,
      monto_usd: null,
      fecha: fechaImpresa,
      comercio,
      articulos,
      texto_completo: limpio,
      legible: true,
      faltantes: [],
    },
    { pedido },
  );
}

/** Amount written in the notes or in the structured reading Laya received. */
export function montoEscrito(texto: string): boolean {
  if (/^Total as printed:\s*(?!not shown\b).+\d/im.test(texto)) return true;
  if (/^Total in US dollars:\s*\d/im.test(texto)) return true;
  return Boolean(totalDe(texto));
}

/** A purchase date written in the notes or in the structured reading. */
export function fechaEscrita(texto: string): boolean {
  const estructurada = texto.match(/^Purchase date:\s*(\d{4}-\d{2}-\d{2})\b/im);
  if (estructurada) return true;
  if (/^Purchase date:\s*not shown\b/im.test(texto)) return false;
  return Boolean(fechaImpresaDe(texto));
}

/**
 * The printed date and the date the organizer asked for are the same day.
 * 02/10 is 2 October when the request says so, the same rule as a photo.
 */
export function fechaCoincideConPedido(texto: string, pedido: string): boolean {
  const condicion = pedido.trim();
  if (!condicion) return false;
  const estructurada = texto.match(/^Purchase date:\s*(\d{4}-\d{2}-\d{2})\b/im);
  const iso = estructurada?.[1] ?? fechaIsoDe(texto, condicion);
  if (!iso) return false;
  return compararFechaPedido(condicion, iso) === "coincide";
}

/** What Laya should read. Structured fields when the transcription has them, otherwise the raw text. */
export function textoParaLaya(descripcion: Descripcion): string {
  return descripcion.lectura ? contextoParaLaya(descripcion.lectura) : descripcion.texto;
}

function fechaIsoDe(texto: string, pedido: string): string | null {
  const impresa = fechaImpresaDe(texto);
  if (!impresa) return null;
  return leerFechaTrabajo(impresa, { pedido, locale: "es-CR" }).elegida;
}

function fechaImpresaDe(texto: string): string | null {
  const etiquetada = texto.match(
    /(?:fecha|date)\s*:?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}\s+de\s+[a-záéíóúñ]+(?:\s+de\s+\d{4})?|\d{4}-\d{2}-\d{2})/i,
  );
  if (etiquetada?.[1]) return etiquetada[1].trim();
  const suelta = texto.match(/\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/);
  return suelta?.[1] ?? null;
}

function totalDe(texto: string): { impreso: string; moneda: "USD" | "CRC" | null } | null {
  const lineas = partir(texto);
  const etiquetadas = lineas.filter((linea) => /\b(?:total|importe|amount due|grand total|balance due)\b/i.test(linea));
  const fuentes = etiquetadas.length > 0 ? etiquetadas : lineas.filter((linea) => /(?:USD|US\$|₡|\bCRC\b|\$\s*\d)/i.test(linea));
  for (let indice = fuentes.length - 1; indice >= 0; indice -= 1) {
    const leido = empaquetarTotal(fuentes[indice] ?? "");
    if (leido) return leido;
  }
  return null;
}

function empaquetarTotal(fragmento: string): { impreso: string; moneda: "USD" | "CRC" | null } | null {
  const leido = leerMontoRecibo(fragmento);
  if (!leido || leido.centavos <= 0) return null;
  const moneda = monedaExplicita(fragmento);
  const numero = fragmento.match(/(?:USD|US\$|CRC|₡|\$)?\s*\d[\d.,]*/i)?.[0]?.replace(/\s+/g, " ").trim() ?? leido.texto;
  return { impreso: numero, moneda: moneda ?? (leido.moneda === "USD" || leido.moneda === "CRC" ? leido.moneda : null) };
}

function monedaExplicita(texto: string): "USD" | "CRC" | null {
  if (/₡|\bCRC\b|col[oó]nes/i.test(texto)) return "CRC";
  if (/\bUSD\b|\bUS\$|\bdollars?\b/i.test(texto)) return "USD";
  return null;
}

function comercioDe(texto: string): string | null {
  for (const linea of partir(texto)) {
    if (esLineaDeFecha(linea) || esLineaDeTotal(linea)) continue;
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,}/.test(linea)) continue;
    return linea.slice(0, 80);
  }
  return null;
}

function articulosDe(texto: string, comercio: string | null): string[] {
  const items: string[] = [];
  for (const linea of partir(texto)) {
    if (comercio && linea === comercio) continue;
    if (esLineaDeFecha(linea) || esLineaDeTotal(linea)) continue;
    if (/\b(?:subtotal|tax|iva|cambio|change|cashier|cajero|thank you|gracias)\b/i.test(linea)) continue;
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,}/.test(linea)) continue;
    const nombre = linea.replace(/\s*(?:USD|US\$|CRC|₡|\$)?\s*\d[\d.,]*\s*(?:USD|CRC|dollars?|colones)?\s*$/i, "").trim();
    if (nombre.length < 2 || items.includes(nombre)) continue;
    items.push(nombre);
    if (items.length >= 12) break;
  }
  return items;
}

function partir(texto: string): string[] {
  const cortado = texto
    .replace(/\s+(?=(?:fecha|date)\s*:)/gi, "\n")
    .replace(/\s+(?=\b(?:total|importe|grand total|amount due)\b)/gi, "\n");
  return cortado
    .split(/\n/)
    .map((linea) => linea.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function esLineaDeFecha(linea: string): boolean {
  return /^(?:fecha|date)\b/i.test(linea);
}

function esLineaDeTotal(linea: string): boolean {
  return /\b(?:total|importe|amount due|grand total|balance due)\b/i.test(linea);
}
