import type { TipoTarea } from "@/lib/integrante/tipos";
import type { RespuestasFactura, RespuestasTrabajo } from "./laya";
import { montoSinUsd, type LecturaEvidencia } from "./lectura";
import { condicionPideLugar } from "./lugar-pedido";
import type { DetalleRazones } from "./snapshot-razones";

export type SeveridadNota = "good" | "warning" | "problem";

export type EtiquetaNota = {
  id: string;
  texto: string;
  explicacion: string;
  severidad: SeveridadNota;
  preguntas: string[];
};

export type EntradaRazones = {
  clase: DetalleRazones["clase"];
  trabajo: RespuestasTrabajo | null;
  factura: RespuestasFactura | null;
  descripcion: string;
  cerca: readonly string[];
  monto: string | null;
  fecha: string | null;
  tope: string | null;
  /** The task type. A reimbursement gets the saved amount and date tags even when Laya did not call it a receipt. */
  tipo?: TipoTarea;
  lectura?: LecturaEvidencia | null;
  /**
   * The task condition. Recomputed on read, so an old review drops `wrong_place`
   * when this text does not ask for a place. The stored grade is unchanged.
   */
  condicion?: string | null;
};

const ORDEN = [
  "cap_otra",
  "cap_no_coincide",
  "cap_sin_empezar",
  "cap_otro_gasto",
  "cap_no_razonable",
  "photo_unclear",
  "selfie_or_empty",
  "amount_missing",
  "currency_unknown",
  "date_missing",
  "over_cap",
  "unclear_match",
  "none_shown",
  "part_missing",
  "unfinished",
  "wrong_place",
  "no_item",
  "low_detail",
  "matches",
  "finished",
  "amount_date",
] as const;

const SEVERIDAD: Record<SeveridadNota, number> = { problem: 0, warning: 1, good: 2 };

const BORROSO =
  /\b(?:blur(?:ry|red)?|out of focus|unfocused|illegible|unreadable|not legible|too dark|fuzzy|unclear|hard to (?:see|read)|can(?:not|'t) (?:see|read))\b/i;

const MONTO = /^\d+([.,]\d{1,2})?$/;

/** Tags come only from answers already stored. They never change the grade or a payment. */
export function etiquetasDe(entrada: EntradaRazones): EtiquetaNota[] {
  const etiquetas: EtiquetaNota[] = [];
  const trabajo = entrada.clase === "trabajo" ? entrada.trabajo : null;
  const factura = entrada.clase === "factura" ? entrada.factura : null;
  const otra = entrada.clase === "otra";
  const borroso = entrada.lectura?.legible === false || BORROSO.test(entrada.descripcion);
  const reembolso = entrada.clase === "factura" || entrada.tipo === "reembolso";
  const sinUsd = reembolso && montoSinUsd(entrada.lectura);

  if (otra) {
    etiquetas.push(etiqueta(
      "cap_otra",
      "Serious issue: no work or receipt shown",
      "The photo is not the requested work and not a receipt, so the grade stays Insufficient.",
      "problem",
      ["c1"],
    ));
  }
  if (trabajo?.v1 === "es_otra_cosa") {
    etiquetas.push(etiqueta(
      "cap_no_coincide",
      "Serious issue: does not match the request",
      "The photo does not match what was requested, so the grade stays Insufficient.",
      "problem",
      ["v1"],
    ));
  }
  if (trabajo?.t6 === "sin_empezar") {
    etiquetas.push(etiqueta(
      "cap_sin_empezar",
      "Serious issue: the work has not started",
      "The work has not started, so the grade stays Insufficient.",
      "problem",
      ["t6"],
    ));
  }
  if (factura?.f1 === "otro_gasto") {
    etiquetas.push(etiqueta(
      "cap_otro_gasto",
      "Serious issue: a different expense",
      "The expense is a different kind from the one requested, so the grade stays Insufficient.",
      "problem",
      ["f1"],
    ));
  }
  if (factura && !factura.g2) {
    etiquetas.push(etiqueta(
      "cap_no_razonable",
      "Cannot be Completed: the expense is not reasonable",
      "The expense is not reasonable for the task, so the grade cannot reach Completed.",
      "warning",
      ["g2"],
    ));
  }
  if (borroso) {
    etiquetas.push(etiqueta(
      "photo_unclear",
      "Photo unclear or blurry",
      "The description says the photo is blurry, dark, or hard to read.",
      "problem",
      otra ? ["c1"] : [],
    ));
  }
  if (otra) {
    etiquetas.push(etiqueta(
      "selfie_or_empty",
      "Looks like a selfie / no work or receipt shown",
      "The photo was classified as something other than the requested work or a receipt.",
      "problem",
      ["c1"],
    ));
  }

  const matchDebil: string[] = [];
  if (trabajo?.v1 === "no_se_puede_saber") matchDebil.push("v1");
  if (factura?.f1 === "no_se_ve") matchDebil.push("f1");
  if (matchDebil.length > 0) {
    etiquetas.push(etiqueta(
      "unclear_match",
      "Match is unclear",
      "The answers do not say this is what was requested, and they do not say it is something else.",
      "warning",
      matchDebil,
    ));
  }

  const nada: string[] = [];
  if (trabajo?.v2 === 0) nada.push("v2");
  if (factura?.f4 === 0) nada.push("f4");
  if (nada.length > 0) {
    etiquetas.push(etiqueta(
      "none_shown",
      "Requested parts are missing",
      "The answers say none of the requested parts or details are shown.",
      "problem",
      nada,
    ));
  }

  const parciales: string[] = [];
  let parcialProblema = false;
  if (trabajo?.v2 === 1) parciales.push("v2");
  if (trabajo?.v4) {
    parciales.push("v4");
    parcialProblema = true;
  }
  if (factura?.f4 === 1) parciales.push("f4");
  if (parciales.length > 0) {
    etiquetas.push(etiqueta(
      "part_missing",
      "Part of the request missing",
      "The answers say part of what was requested is missing or only partly shown.",
      parcialProblema ? "problem" : "warning",
      parciales,
    ));
  }

  if (trabajo && trabajo.t6 !== "sin_empezar" && (trabajo.t6 === "a_medias" || trabajo.t9)) {
    const ids = [trabajo.t6 === "a_medias" ? "t6" : null, trabajo.t9 ? "t9" : null].filter((id): id is string => Boolean(id));
    etiquetas.push(etiqueta(
      "unfinished",
      "Work unfinished",
      "The answers say the work is only partly done, or that something is unfinished or not visible.",
      trabajo.t9 ? "problem" : "warning",
      ids,
    ));
  }

  if (trabajo && !trabajo.t8 && condicionPideLugar(entrada.condicion)) {
    etiquetas.push(etiqueta(
      "wrong_place",
      "Not done at the requested place",
      "The description does not say it was done at the requested place.",
      "problem",
      ["t8"],
    ));
  }

  const montoGuardado = centavos(entrada.monto) > 0;
  const fechaGuardada = Boolean(entrada.fecha?.trim());
  if (factura && !factura.f2 && !sinUsd) {
    etiquetas.push(etiqueta(
      "amount_missing",
      "Receipt amount missing",
      "The receipt answers do not give an amount.",
      "problem",
      ["f2"],
    ));
  } else if (!montoGuardado && reembolso && !sinUsd) {
    etiquetas.push(etiqueta(
      "amount_missing",
      "Receipt amount missing",
      "The saved receipt has no positive amount, so the grade stays at 40% or less.",
      "problem",
      [],
    ));
  }

  if (sinUsd) {
    const moneda = entrada.lectura?.moneda ?? null;
    const impreso = entrada.lectura?.montoOriginal ?? "";
    etiquetas.push(etiqueta(
      "currency_unknown",
      moneda ? `No rate for ${moneda}` : "Currency not shown",
      moneda
        ? `The receipt total ${impreso} is in ${moneda}, and Hyto has no rate for it, so it was not converted to US dollars. The grade cannot reach Completed. Check the amount before you confirm it.`
        : `The receipt total ${impreso} shows no currency, so Hyto did not assume US dollars and did not convert it. The grade cannot reach Completed. Check the amount before you confirm it.`,
      "warning",
      [],
    ));
  }

  if (factura && !factura.f3) {
    etiquetas.push(etiqueta(
      "date_missing",
      "Receipt date missing",
      "The receipt answers do not give a date.",
      "warning",
      ["f3"],
    ));
  } else if (!fechaGuardada && reembolso) {
    etiquetas.push(etiqueta(
      "date_missing",
      "Receipt date missing",
      entrada.lectura?.fechaImpresa
        ? `The printed date ${entrada.lectura.fechaImpresa} could not be read as a calendar date, so the grade cannot reach Completed.`
        : "The saved receipt has no date, so the grade cannot reach Completed.",
      "warning",
      [],
    ));
  }

  if (factura && !factura.g3) {
    etiquetas.push(etiqueta(
      "no_item",
      "No item named",
      "The receipt answers do not name an item.",
      "problem",
      ["g3"],
    ));
  }

  const tope = centavos(entrada.tope);
  const monto = centavos(entrada.monto);
  if (tope > 0 && monto > tope) {
    etiquetas.push(etiqueta(
      "over_cap",
      "Amount over the cap",
      "The amount is over the task cap, so the grade cannot reach Completed. You can pay up to the cap.",
      "warning",
      ["tope"],
    ));
  }

  const debiles = idsDebiles(trabajo, factura, entrada.cerca);
  if (debiles.length >= 2) {
    etiquetas.push(etiqueta(
      "low_detail",
      "Low detail",
      "Two or more answers are unclear or the model was unsure, so this grade is less certain.",
      "warning",
      debiles,
    ));
  }

  if (trabajo?.v1 === "es_lo_pedido") {
    etiquetas.push(etiqueta(
      "matches",
      "Matches the request",
      "The answers say this is what was requested.",
      "good",
      ["v1"],
    ));
  }
  if (factura?.f1 === "coincide_con_lo_pedido") {
    etiquetas.push(etiqueta(
      "matches",
      "Matches the request",
      "The answers say this expense is what was requested.",
      "good",
      ["f1"],
    ));
  }
  if (trabajo?.t6 === "terminado") {
    etiquetas.push(etiqueta(
      "finished",
      "Finished",
      "The answers say the work is finished.",
      "good",
      ["t6"],
    ));
  }
  if (factura?.f2 && factura.f3 && montoGuardado && fechaGuardada && !(tope > 0 && monto > tope)) {
    etiquetas.push(etiqueta(
      "amount_date",
      "Amount and date found",
      "The receipt answers and the saved fields both include an amount and a date.",
      "good",
      ["f2", "f3"],
    ));
  }

  return ordenarEtiquetas(sinContradicciones(etiquetas, entrada));
}

/**
 * A clear match is not also "missing", and named items are not "no item named".
 * The grade itself is unchanged; only the flags the screen shows.
 */
function sinContradicciones(etiquetas: EtiquetaNota[], entrada: EntradaRazones): EtiquetaNota[] {
  const ids = new Set(etiquetas.map((etiqueta) => etiqueta.id));
  const items = itemsPresentes(entrada);
  const coincide = ids.has("matches");
  const monto = montoPresente(entrada);
  const fecha = fechaPresente(entrada);
  const completo = detalleCompleto(entrada, monto, fecha, items);
  return etiquetas.filter((etiqueta) => {
    if (etiqueta.id === "no_item" && items) return false;
    if (etiqueta.id === "amount_missing" && monto) return false;
    if (etiqueta.id === "date_missing" && fecha) return false;
    if (etiqueta.id === "low_detail" && completo) return false;
    if (coincide && (etiqueta.id === "part_missing" || etiqueta.id === "none_shown" || (etiqueta.id === "amount_missing" && monto))) return false;
    return true;
  });
}

function montoPresente(entrada: EntradaRazones): boolean {
  if (centavos(entrada.monto) > 0) return true;
  if (entrada.lectura?.montoUsd && centavos(entrada.lectura.montoUsd) > 0) return true;
  if (entrada.lectura?.montoOriginal && /\d/.test(entrada.lectura.montoOriginal)) return true;
  return /\b(?:total|importe|usd|us\$)\b[^\n]{0,40}\d/i.test(entrada.descripcion);
}

function fechaPresente(entrada: EntradaRazones): boolean {
  if (entrada.fecha?.trim()) return true;
  if (entrada.lectura?.fecha) return true;
  return /(?:fecha|date)\s*:?\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/i.test(entrada.descripcion);
}

function itemsPresentes(entrada: EntradaRazones): boolean {
  return (entrada.lectura?.articulos ?? []).some((item) => item.trim().length > 0);
}

/** Notes that already name the receipt are not "low detail", even if two answers were unsure. */
function detalleCompleto(entrada: EntradaRazones, monto: boolean, fecha: boolean, items: boolean): boolean {
  if (entrada.lectura?.legible === false || BORROSO.test(entrada.descripcion)) return false;
  const notas = `${entrada.descripcion}\n${entrada.lectura?.textoCompleto ?? ""}`.trim();
  if (notas.length < 40) return false;
  const reembolso = entrada.clase === "factura" || entrada.tipo === "reembolso";
  if (!reembolso) return notas.length >= 160;
  return monto && fecha && (items || notas.length >= 80);
}

/** The reason shown next to the percentage. Tags are sorted, so a problem comes before a warning and a warning before a good sign. */
export function motivoPrincipal(etiquetas: readonly EtiquetaNota[] | null | undefined): EtiquetaNota | null {
  return etiquetas?.[0] ?? null;
}

export function ordenarEtiquetas(etiquetas: readonly EtiquetaNota[]): EtiquetaNota[] {
  return [...etiquetas].sort((a, b) => {
    const porSeveridad = SEVERIDAD[a.severidad] - SEVERIDAD[b.severidad];
    if (porSeveridad !== 0) return porSeveridad;
    return ORDEN.indexOf(a.id as (typeof ORDEN)[number]) - ORDEN.indexOf(b.id as (typeof ORDEN)[number]);
  });
}

function idsDebiles(
  trabajo: RespuestasTrabajo | null,
  factura: RespuestasFactura | null,
  cerca: readonly string[],
): string[] {
  const ids = new Set<string>();
  if (trabajo?.lugar === "no_claro") ids.add("lugar");
  if (trabajo?.v1 === "no_se_puede_saber") ids.add("v1");
  if (trabajo?.t5 === "otra_o_no_claro") ids.add("t5");
  if (trabajo?.t6 === "no_claro") ids.add("t6");
  if (factura?.f1 === "no_se_ve") ids.add("f1");
  if (factura?.g1 === "otro_o_no_claro") ids.add("g1");
  for (const id of cerca) ids.add(id);
  return [...ids];
}

function etiqueta(
  id: string,
  texto: string,
  explicacion: string,
  severidad: SeveridadNota,
  preguntas: string[],
): EtiquetaNota {
  return { id, texto, explicacion, severidad, preguntas };
}

function centavos(valor: string | null): number {
  const texto = valor?.trim() ?? "";
  if (!MONTO.test(texto)) return 0;
  const [entero, fraccion = ""] = texto.replace(",", ".").split(".");
  return Number(entero) * 100 + Number((fraccion + "00").slice(0, 2));
}
