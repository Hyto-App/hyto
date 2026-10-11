import type { Idioma } from "@/lib/ui/idioma";
import { presentarEtiqueta } from "./notas-idioma";
import type { EtiquetaNota } from "./razones";

/** Tags that say something the task asks for is not in the evidence. */
const IDS_FALTA = ["cap_otra", "cap_no_coincide", "none_shown", "part_missing", "unfinished", "amount_missing", "date_missing"] as const;

const FALTA = { es: "Falta: ", en: "Missing: " } as const;
const SIN_CONFIRMAR = { es: "No se pudo confirmar: ", en: "Not confirmed: " } as const;
const CABEZA_SIN_CONFIRMAR = { es: "Falta confirmar: ", en: "Still to confirm: " } as const;

const FIJOS: Record<string, { es: string; en: string }> = {
  amount_missing: { es: "el monto de la factura", en: "the invoice amount" },
  date_missing: { es: "la fecha de la factura", en: "the invoice date" },
};

/**
 * One line for the result card's strip: «Falta: el mantel; la hoja de registro.» Null when nothing is missing.
 * Items come from tags that name what is missing. When the answers only could not confirm the task's items,
 * the line says «Falta confirmar: …». A tag without a list adds nothing.
 */
export function textoFalta(etiquetas: readonly EtiquetaNota[] | null | undefined, idioma: Idioma): string | null {
  if (!etiquetas || etiquetas.length === 0) return null;
  const lengua = idioma === "es" ? "es" : "en";
  const faltan: string[] = [];
  const sinConfirmar: string[] = [];
  const agregar = (destino: string[], parte: string) => {
    for (const item of parte.trim().replace(/[.;]+$/, "").split(/;\s*/)) {
      const limpio = item.trim();
      const llave = limpio.toLowerCase();
      if (limpio && ![...faltan, ...sinConfirmar].some((existente) => existente.toLowerCase() === llave)) destino.push(limpio);
    }
  };
  for (const etiqueta of etiquetas) {
    if (!(IDS_FALTA as readonly string[]).includes(etiqueta.id)) continue;
    const fijo = FIJOS[etiqueta.id];
    if (fijo) {
      agregar(faltan, fijo[lengua]);
      continue;
    }
    const explicacion = presentarEtiqueta(etiqueta, idioma).explicacion;
    if (explicacion.startsWith(FALTA[lengua])) agregar(faltan, explicacion.slice(FALTA[lengua].length));
    else if (explicacion.startsWith(SIN_CONFIRMAR[lengua])) agregar(sinConfirmar, explicacion.slice(SIN_CONFIRMAR[lengua].length));
  }
  if (faltan.length > 0) return `${FALTA[lengua]}${faltan.join("; ")}.`;
  if (sinConfirmar.length > 0) return `${CABEZA_SIN_CONFIRMAR[lengua]}${sinConfirmar.join("; ")}.`;
  return null;
}
