import type { Idioma } from "@/lib/ui/idioma";

/**
 * Mile names what is missing in a new sentence on every review. The screen does not keep that
 * sentence. Each item maps to the task requirement it refers to, in the UI language.
 */
const COMIDA = {
  es: "la evidencia del comprobante de la comida",
  en: "evidence of the meal receipt",
} as const;
const MONTO = { es: "el monto de la factura", en: "the invoice amount" } as const;
const FECHA = { es: "la fecha de la factura", en: "the invoice date" } as const;
const GENERICO = { es: "algo de lo pedido", en: "something the task asks for" } as const;

type Clase = "comida" | "monto" | "fecha" | "generico" | "propio";

function limpio(item: string): string {
  return item.replace(/\s+/g, " ").trim().replace(/[.;]+$/, "");
}

/** A sentence Mile wrote, not the requirement's own words. */
const PROSA =
  /\b(?:no se (?:muestra|ve|observa|aprecia|puede)|no es visible|no aparece|not visible|is not (?:shown|visible)|not shown|does not show|isn't visible|cannot be seen|can't see)\b/i;

function esMonto(texto: string): boolean {
  const tiene = /\b(?:monto|amount)\b/.test(texto);
  if (!tiene) return false;
  if (/\b(?:factura|invoice|recibo|receipt|comprobante)\b/.test(texto)) return true;
  return /\b(?:no se|not visible|is missing|missing|no aparece|no es visible)\b/.test(texto);
}

function esFecha(texto: string): boolean {
  if (/\b(?:purchase date|fecha de compra|fecha impresa)\b/.test(texto)) return true;
  const tiene = /\b(?:fecha|date)\b/.test(texto);
  if (!tiene) return false;
  if (/\b(?:factura|invoice|recibo|receipt|comprobante)\b/.test(texto)) return true;
  return /\b(?:no se|not visible|is missing|missing|no aparece|no es visible)\b/.test(texto);
}

function esComida(texto: string): boolean {
  if (/comprobante de la comida|meal receipt|foto del comprobante|evidencia del comprobante|photo of the meal|evidence of the meal/.test(texto)) {
    return true;
  }
  return /\b(?:comprobante|receipt)\b/.test(texto) && /\b(?:comida|meal)\b/.test(texto);
}

export function claseFaltante(item: string): Clase {
  const texto = limpio(item).toLowerCase();
  if (!texto) return "propio";
  if (texto === GENERICO.es || texto === GENERICO.en) return "generico";
  if (esMonto(texto)) return "monto";
  if (esFecha(texto)) return "fecha";
  if (esComida(texto)) return "comida";
  if (PROSA.test(texto)) return "generico";
  return "propio";
}

/** The requirement this missing item refers to, in the reader's language. A label that already is the requirement stays. */
export function fraseFaltante(item: string, idioma: Idioma): string {
  const lengua = idioma === "es" ? "es" : "en";
  const clase = claseFaltante(item);
  if (clase === "comida") return COMIDA[lengua];
  if (clase === "monto") return MONTO[lengua];
  if (clase === "fecha") return FECHA[lengua];
  if (clase === "generico") return GENERICO[lengua];
  return limpio(item);
}

/**
 * What gets stored on the note: the requirement, in one wording, so the next review does not
 * keep Mile's sentence. Labels that already name a task item stay as written.
 */
export function canonicoFaltante(item: string): string {
  return fraseFaltante(item, "en");
}
