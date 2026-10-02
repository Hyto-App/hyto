import type { RespuestasFactura, RespuestasTrabajo } from "./laya";
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
};

const ORDEN = [
  "cap_otra",
  "cap_no_coincide",
  "cap_sin_empezar",
  "cap_otro_gasto",
  "cap_no_razonable",
  "photo_unclear",
  "selfie_or_empty",
  "unclear_match",
  "none_shown",
  "part_missing",
  "unfinished",
  "wrong_place",
  "amount_missing",
  "date_missing",
  "no_item",
  "over_cap",
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
  const borroso = BORROSO.test(entrada.descripcion);

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

  if (trabajo && !trabajo.t8) {
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
  if (factura && !factura.f2) {
    etiquetas.push(etiqueta(
      "amount_missing",
      "Receipt amount missing",
      "The receipt answers do not give an amount.",
      "problem",
      ["f2"],
    ));
  } else if (!montoGuardado && entrada.clase === "factura") {
    etiquetas.push(etiqueta(
      "amount_missing",
      "Receipt amount missing",
      "The saved receipt has no positive amount.",
      "problem",
      [],
    ));
  }

  if (factura && !factura.f3) {
    etiquetas.push(etiqueta(
      "date_missing",
      "Receipt date missing",
      "The receipt answers do not give a date.",
      "problem",
      ["f3"],
    ));
  } else if (!fechaGuardada && entrada.clase === "factura") {
    etiquetas.push(etiqueta(
      "date_missing",
      "Receipt date missing",
      "The saved receipt has no date.",
      "problem",
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
      "The amount is over the task cap, so the grade cannot go above 40.",
      "problem",
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

  return ordenarEtiquetas(etiquetas);
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
