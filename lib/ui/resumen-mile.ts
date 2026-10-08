import { texto } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";

/** Fields already stored on the review. The summary is built from these, not from a new model call. */
export type LecturaResumen = {
  comercio?: string | null;
  montoOriginal?: string | null;
};

export type ResumenVisible = {
  linea: string;
  /** The rest of Mile's note. Null when the line already says it. */
  resto: string | null;
};

const TOPE = 140;
const SUFIJO_CATEGORIA = /\s+Category\s+[^.]{0,80},\s+grade\s+\d{1,3}%\.\s*$/i;

/** The stored phrase ends with an English grade suffix. The screen already shows the percentage. */
export function cuerpoDeFrase(frase: string): string {
  return frase.replace(SUFIJO_CATEGORIA, "").replace(/\s+/g, " ").trim();
}

function marcas(valor: string, patron: RegExp): number {
  return valor.match(patron)?.length ?? 0;
}

/** Null when the text does not lean clearly to one language. */
export function idiomaDelTexto(valor: string): Idioma | null {
  const es = marcas(valor, /[áéíóúüñ¿¡]|\b(?:el|la|los|las|una|foto|recibo|muestra|está|comprobante|mesa|con)\b/gi);
  const en = marcas(valor, /\b(?:the|photo|receipt|shows|table|banner|with|and|visible|set)\b/gi);
  if (es === 0 && en === 0) return null;
  if (es > en) return "es";
  if (en > es) return "en";
  return null;
}

function plantilla(lectura: LecturaResumen | null | undefined, idioma: Idioma): string | null {
  const comercio = lectura?.comercio?.trim() ?? "";
  const monto = lectura?.montoOriginal?.trim() ?? "";
  if (comercio && monto) return texto(idioma, "mile.reciboDe", { comercio, monto });
  if (comercio) return texto(idioma, "mile.reciboComercio", { comercio });
  return null;
}

function partir(valor: string): ResumenVisible {
  const limpio = valor.replace(/\s+/g, " ").trim();
  if (!limpio) return { linea: "", resto: null };
  const punto = limpio.search(/\.\s+\S/);
  if (punto !== -1 && punto <= 180) {
    const linea = limpio.slice(0, punto + 1).trim();
    const resto = limpio.slice(punto + 1).trim();
    return { linea, resto: resto || null };
  }
  if (limpio.length <= TOPE) return { linea: limpio, resto: null };
  const corte = limpio.lastIndexOf(" ", TOPE);
  const en = corte > 40 ? corte : TOPE;
  const resto = limpio.slice(en).trim();
  return { linea: limpio.slice(0, en).trim(), resto: resto || null };
}

/**
 * One line in the UI language, plus the rest of the note.
 * The stored review text is not rewritten and is not sent back to the model.
 */
export function resumirFrase(
  frase: string,
  idioma: Idioma,
  lectura?: LecturaResumen | null,
): ResumenVisible {
  const cuerpo = cuerpoDeFrase(frase);
  if (!cuerpo) {
    const linea = plantilla(lectura, idioma) ?? texto(idioma, "mile.describio");
    return { linea, resto: null };
  }
  const detectado = idiomaDelTexto(cuerpo);
  if (detectado && detectado !== idioma) {
    const linea = plantilla(lectura, idioma) ?? texto(idioma, "mile.describio");
    return { linea, resto: cuerpo };
  }
  return partir(cuerpo);
}
