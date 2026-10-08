import type { Idioma } from "@/lib/ui/idioma";

const MARCA_ES =
  /[áéíóúüñ¿¡]|\b(?:el|la|los|las|una|recibo|foto|muestra|está|comprobante|mesa|artículos|impresa|fecha|colones)\b/gi;
const MARCA_EN =
  /\b(?:the|receipt|photo|shows|table|banner|with|and|visible|from|torn|blurry|facing|meal|amount|date|invoice|printed|readable)\b/gi;

/** Null when the text does not lean clearly to one language. */
export function idiomaDelTexto(valor: string): Idioma | null {
  const es = (valor.match(MARCA_ES) ?? []).length;
  const en = (valor.match(MARCA_EN) ?? []).length;
  if (es === 0 && en === 0) return null;
  if (es > en) return "es";
  if (en > es) return "en";
  return null;
}

const SUFIJO_NOTA = /\s+Category\s+([^,]{1,80}),\s+grade\s+(\d{1,3})%\.\s*$/i;

const CATEGORIA_ES: Record<string, string> = {
  receipt: "recibo",
  invoice: "factura",
  booth: "puesto",
  work: "trabajo",
  other: "otra",
  recibo: "recibo",
  factura: "factura",
  puesto: "puesto",
  trabajo: "trabajo",
  otra: "otra",
};

const FALTANTE_ES: [RegExp, string][] = [
  [/\b(date|fecha)\b/i, "la fecha"],
  [/\b(total|amount|monto)\b/i, "el total"],
  [/\b(merchant|store|comercio|business)\b/i, "el nombre del comercio"],
  [/\b(item|items|artículo|articulos|artículos)\b/i, "los artículos"],
];

const FALTANTE_EN: [RegExp, string][] = [
  [/\b(fecha|date)\b/i, "the date"],
  [/\b(total|monto|amount)\b/i, "the total"],
  [/\b(comercio|merchant|store)\b/i, "the merchant name"],
  [/\b(artículos|articulos|items)\b/i, "the items"],
];

function traducirFaltante(item: string, idioma: Idioma): string | null {
  const tabla = idioma === "es" ? FALTANTE_ES : FALTANTE_EN;
  for (const [patron, salida] of tabla) {
    if (patron.test(item)) return salida;
  }
  return null;
}

/** A missing-detail phrase in the person's language. Unknown wording stays, unless it is clearly the other language. */
export function faltanteEnIdioma(item: string, idioma: Idioma): string {
  const limpio = item.trim();
  if (!limpio) return limpio;
  const detectado = idiomaDelTexto(limpio);
  if (!detectado || detectado === idioma) return limpio;
  return (
    traducirFaltante(limpio, idioma) ??
    (idioma === "es" ? "un dato que no se ve" : "something that is not visible")
  );
}

function lista(partes: string[]): string {
  return partes.filter(Boolean).join(", ");
}

function comercioDe(cuerpo: string): string {
  const nombre = /\b([A-ZÁÉÍÓÚÑ][\p{L}\d'&. -]{1,50}?)\s+receipt\b/u.exec(cuerpo);
  if (nombre) {
    const limpio = nombre[1].replace(/^(?:A|An)\s+(?:printed\s+)?/i, "").trim();
    if (limpio) return limpio;
  }
  const deRecibo = /\breceipt from\s+([^.]{2,60})/i.exec(cuerpo);
  if (deRecibo) return deRecibo[1].replace(/\s+for\s+.*/i, "").trim();
  const comercio = /\b(?:merchant|store|comercio)\b[^.]{0,20}?:\s*([^.]{2,60})/i.exec(cuerpo);
  return comercio?.[1]?.trim() ?? "";
}

function montoDe(cuerpo: string): string {
  return cuerpo.match(/₡\s?[\d.,]+|US\$\s?[\d.,]+|\$\s?[\d.,]+/)?.[0]?.trim() ?? "";
}

function fechaDe(cuerpo: string): string {
  return cuerpo.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/)?.[0] ?? "";
}

function pareceDescripcion(valor: string): boolean {
  return /\b(?:receipt|invoice|photo|shows|banner|table|booth|recibo|foto|muestra|comprobante|factura)\b/i.test(valor);
}

/**
 * A short description in the UI language, built from what the sentence already says.
 * Empty when there is nothing safe to say.
 */
export function redactarDesdeProsa(cuerpo: string, idioma: Idioma): string {
  const comercio = comercioDe(cuerpo);
  const monto = montoDe(cuerpo);
  const fecha = fechaDe(cuerpo);
  const recibo = /\b(?:receipt|invoice|recibo|factura|comprobante)\b/i.test(cuerpo);
  const trabajo = /\b(?:table|banner|booth|photo|mesa|trabajo|puesto)\b/i.test(cuerpo);
  const sinFecha = /\b(?:no date|without a date|date is not|sin fecha|no hay fecha)\b/i.test(cuerpo);
  const borrosa = /\b(?:blurry|too dark|cut off|unreadable|borrosa|oscura|cortada)\b/i.test(cuerpo);
  const incompleta = /\b(?:not visible|out of frame|back of the room|no se ve|no entra)\b/i.test(cuerpo);
  if (!recibo && !trabajo && !monto && !comercio) return "";
  if (idioma === "es") {
    const partes: string[] = [];
    if (recibo || monto || comercio) {
      partes.push(comercio ? `La foto muestra un recibo de ${comercio}.` : "La foto muestra un recibo.");
      if (monto) partes.push(`El total impreso es ${monto}.`);
      else if (recibo) partes.push("No se ve un total.");
      if (fecha) partes.push(`La fecha impresa es ${fecha}.`);
      else if (sinFecha || recibo) partes.push("No se ve la fecha.");
    } else {
      partes.push("La foto muestra el trabajo.");
      if (incompleta) partes.push("Parte de lo pedido no entra en la foto.");
    }
    if (borrosa) partes.push("La foto no se lee bien.");
    return partes.join(" ");
  }
  const partes: string[] = [];
  if (recibo || monto || comercio) {
    partes.push(comercio ? `The photo shows a receipt from ${comercio}.` : "The photo shows a receipt.");
    if (monto) partes.push(`The printed total is ${monto}.`);
    else if (recibo) partes.push("No total is visible.");
    if (fecha) partes.push(`The printed date is ${fecha}.`);
    else if (sinFecha || recibo) partes.push("No date is visible.");
  } else {
    partes.push("The photo shows the work.");
    if (incompleta) partes.push("Part of what was asked for is out of the frame.");
  }
  if (borrosa) partes.push("The photo is hard to read.");
  return partes.join(" ");
}

export type DatosDescripcion = {
  tipo: "recibo" | "trabajo" | "otra" | null;
  montoOriginal: string | null;
  fechaImpresa: string | null;
  comercio: string | null;
  articulos: string[];
  legible: boolean | null;
  faltantes: string[];
};

/** A description in the person's language, using only fields already read from the photo. */
export function redactarLectura(datos: DatosDescripcion, idioma: Idioma): string {
  const comercio = datos.comercio?.trim() ?? "";
  const monto = datos.montoOriginal?.trim() ?? "";
  const fecha = datos.fechaImpresa?.trim() ?? "";
  const articulos = datos.articulos.map((item) => item.trim()).filter(Boolean);
  const faltantes = datos.faltantes.map((item) => faltanteEnIdioma(item, idioma)).filter(Boolean);
  const recibo = datos.tipo === "recibo" || Boolean(monto) || Boolean(comercio);
  if (idioma === "es") {
    const partes: string[] = [];
    if (recibo) {
      partes.push(comercio ? `La foto muestra un recibo de ${comercio}.` : "La foto muestra un recibo.");
      if (articulos.length) partes.push(`Se ven estos artículos: ${lista(articulos)}.`);
      partes.push(monto ? `El total impreso es ${monto}.` : "No se ve un total.");
      partes.push(fecha ? `La fecha impresa es ${fecha}.` : "No se ve la fecha.");
    } else {
      partes.push("La foto muestra el trabajo.");
      if (articulos.length) partes.push(`Se ven: ${lista(articulos)}.`);
    }
    if (datos.legible === false) partes.push("La foto no se lee bien.");
    if (faltantes.length) partes.push(`Falta en la foto: ${lista(faltantes)}.`);
    return partes.join(" ");
  }
  const partes: string[] = [];
  if (recibo) {
    partes.push(comercio ? `The photo shows a receipt from ${comercio}.` : "The photo shows a receipt.");
    if (articulos.length) partes.push(`These items are visible: ${lista(articulos)}.`);
    partes.push(monto ? `The printed total is ${monto}.` : "No total is visible.");
    partes.push(fecha ? `The printed date is ${fecha}.` : "No date is visible.");
  } else {
    partes.push("The photo shows the work.");
    if (articulos.length) partes.push(`Visible: ${lista(articulos)}.`);
  }
  if (datos.legible === false) partes.push("The photo is hard to read.");
  if (faltantes.length) partes.push(`Missing from the photo: ${lista(faltantes)}.`);
  return partes.join(" ");
}

function sufijoVisible(categoria: string, grado: string, idioma: Idioma): string {
  if (idioma !== "es") return ` Category ${categoria}, grade ${grado}%.`;
  const nombre = CATEGORIA_ES[categoria.trim().toLowerCase()] ?? categoria.trim();
  return ` Categoría ${nombre}, nota ${grado}%.`;
}

/**
 * Mile's saved sentence, in the UI language.
 * Only a real description is rewritten. Titles, errors, and short notes stay as they are.
 */
export function alinearFraseMile(frase: string, idioma: Idioma): string {
  const marca = SUFIJO_NOTA.exec(frase);
  const cuerpo = (marca ? frase.slice(0, marca.index) : frase).trim();
  if (!cuerpo) return frase;
  const larga = cuerpo.length >= 80 && pareceDescripcion(cuerpo);
  if (!marca && !larga) return frase;
  const detectado = idiomaDelTexto(cuerpo);
  const cuerpoAlineado =
    detectado && detectado !== idioma ? redactarDesdeProsa(cuerpo, idioma) || cuerpo : cuerpo;
  if (!marca) return cuerpoAlineado === cuerpo ? frase : cuerpoAlineado;
  return `${cuerpoAlineado}${sufijoVisible(marca[1], marca[2], idioma)}`;
}
