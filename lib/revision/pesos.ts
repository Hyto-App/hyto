import type { Veredicto } from "@/lib/admin/tipos";
import type { RespuestasFactura, RespuestasTrabajo } from "./laya";
import { condicionPideLugar } from "./lugar-pedido";
import type { CoincideGroq } from "./otra-groq";
import { mileTecho80Activo, type EntornoTecho } from "./techo-bandera";

/**
 * Weights for Laya's second call. Tune these numbers. Each path sums to 100.
 *
 * The grade is the sum of (weight × credit). Credit is 1, 0.5, or 0.
 * Half credit is only used on the ordered answers listed below, and those
 * weights are even, so the sum is an integer from 0 to 100.
 *
 * Credit — what "answered correctly" means:
 *
 * Work
 * - v1 match: es_lo_pedido = 1, no_se_puede_saber = 0.5, es_otra_cosa = 0
 * - v2 parts named: index 2 = 1, index 1 = 0.5, index 0 = 0
 * - v3 names a proof: yes = 1, no = 0
 * - v4 something requested is missing: no = 1, yes = 0
 * - t5 what was done: a named action = 1, including documentar_evento, otra_o_no_claro = 0
 * - t6 state: terminado = 1, no_aplica = 1, a_medias = 0.5, sin_empezar = 0, no_claro = 0.
 *   no_aplica means the photo is a scene or an event, so the finished / not-started
 *   question does not apply. It is neutral (full credit) and does not add sin_empezar.
 *   Laya is offered that option only when HYTO_MILE_PREGUNTAS_EVENTO is on.
 * - t7 tools or materials: yes = 1, no = 0
 * - t8 done at the requested place: yes = 1, no = 0.
 *   When the condition does not ask for a place (`condicionPideLugar`), t8 is
 *   neutral and the credit is 1, so the weights still sum to 100. New reviews
 *   only: the stored grade is not rewritten on read.
 * - t9 unfinished, damaged, or not visible: no = 1, yes = 0
 * - t10 overall: index 2 = 1, index 1 = 0.5, index 0 = 0
 * - lugar place type: a named place = 1, no_claro = 0
 *
 * Invoice
 * - f1 spent on the request: coincide_con_lo_pedido = 1, no_se_ve = 0.5, otro_gasto = 0
 * - f2 amount is a number: yes = 1, no = 0
 * - f3 date stated: yes = 1, no = 0
 * - f4 required details named: index 2 = 1, index 1 = 0.5, index 0 = 0
 * - g1 expense type: a named category = 1, otro_o_no_claro = 0
 * - g2 reasonable for the task: yes = 1, no = 0
 * - g3 at least one item: yes = 1, no = 0
 * - g4 merchant named: yes = 1, no = 0
 * - g5 Laya's own final score: index 2 = 1, index 1 = 0.5, index 0 = 0
 *
 * Classification "otra" forces grade 0 only when the match question also fails (v1 es_otra_cosa).
 * Otherwise the work weights apply, so requested scene evidence is not forced to 0.
 *
 * A yes/no question gives full weight only to the answer that supports a valid
 * expense or a finished task. For "is something missing / unfinished", that
 * answer is no.
 *
 * Display bands, derived from the percentage. They do not approve a payment:
 * under 50 insuficiente, 50–79 parcial, 80–100 cumplió.
 * The screen shows those bands as Insufficient, Partially completed, and Completed.
 *
 * Caps live in calificar. They do not change PESOS_PREGUNTAS.
 * - TOPE_FALTA_GRAVE (49): classification "otra" with no match, v1 es_otra_cosa, t6 sin_empezar
 *   (t6 no_aplica does not use this cap),
 *   f1 otro_gasto (a different kind of expense), or a photo that breaks a rule the organizer
 *   wrote for the event. The band stays insuficiente. A receipt that follows the rule is not
 *   capped by it, so it does not land on the same grade as one that breaks it.
 * - TOPE_FALTA_SERIA (79): g2 is false. The band cannot be cumplió. A reimbursement also stops at 79
 *   when the purchase date is missing, when the printed total has no currency Hyto can convert to US
 *   dollars, or when the dollar amount is over the task cap. The confirmed amount, which cannot pass
 *   the cap, is what gets paid.
 * - TOPE_NOTA_REEMBOLSO (40): a reimbursement with no positive total at all.
 * When more than one cap applies, the lowest one wins.
 *
 * HYTO_MILE_TECHO_80 does not change these weights or the 80 band. When it is
 * on, puntosTecho80 returns the half of v2 and of t10 that the middle step
 * withholds, and only for a legible work reading that lists nothing missing
 * and that Laya called a match, or whose coincide field is the stored value si.
 * Absent, parcial, and no do not lift. Off, that function returns 0.
 */
export const PESOS_PREGUNTAS = {
  trabajo: {
    lugar: 1,
    v1: 20,
    v2: 16,
    v3: 4,
    v4: 10,
    t5: 2,
    t6: 16,
    t7: 1,
    t8: 12,
    t9: 10,
    t10: 8,
  },
  factura: {
    f1: 18,
    f2: 10,
    f3: 10,
    f4: 14,
    g1: 6,
    g2: 20,
    g3: 10,
    g4: 2,
    g5: 10,
  },
} as const;

export const TOPE_NOTA_REEMBOLSO = 40;
export const TOPE_FALTA_GRAVE = 49;
export const TOPE_FALTA_SERIA = 79;
export const UMBRAL_PARCIAL = 50;
export const UMBRAL_CUMPLIO = 80;

export type MotivoTope =
  | "otra"
  | "no_coincide"
  | "sin_empezar"
  | "otro_gasto"
  | "regla_evento"
  | "gasto_no_razonable"
  | "sin_monto"
  | "sin_fecha"
  | "moneda_sin_usd"
  | "sobre_tope";

const TOPE_DE: Record<MotivoTope, number> = {
  otra: TOPE_FALTA_GRAVE,
  no_coincide: TOPE_FALTA_GRAVE,
  sin_empezar: TOPE_FALTA_GRAVE,
  otro_gasto: TOPE_FALTA_GRAVE,
  regla_evento: TOPE_FALTA_GRAVE,
  gasto_no_razonable: TOPE_FALTA_SERIA,
  sin_monto: TOPE_NOTA_REEMBOLSO,
  sin_fecha: TOPE_FALTA_SERIA,
  moneda_sin_usd: TOPE_FALTA_SERIA,
  sobre_tope: TOPE_FALTA_SERIA,
};

export function motivosTrabajo(respuestas: RespuestasTrabajo): MotivoTope[] {
  const motivos: MotivoTope[] = [];
  if (respuestas.v1 === "es_otra_cosa") motivos.push("no_coincide");
  if (respuestas.t6 === "sin_empezar") motivos.push("sin_empezar");
  return motivos;
}

/** A broken organizer rule. A missing answer is not a broken rule. */
export function motivosDeRegla(cumple: boolean | null | undefined): MotivoTope[] {
  return cumple === false ? ["regla_evento"] : [];
}

export function motivosFactura(respuestas: RespuestasFactura): MotivoTope[] {
  const motivos: MotivoTope[] = [];
  if (respuestas.f1 === "otro_gasto") motivos.push("otro_gasto");
  if (!respuestas.g2) motivos.push("gasto_no_razonable");
  return motivos;
}

/** Every grade cap is applied here. The weights stay in notaDeTrabajo and notaDeFactura. */
export function calificar(
  nota: number,
  motivos: readonly MotivoTope[],
): { nota: number; veredicto: Veredicto; motivos: MotivoTope[] } {
  const unicos: MotivoTope[] = [];
  for (const motivo of motivos) {
    if (!unicos.includes(motivo)) unicos.push(motivo);
  }
  let limitada = notaEntera(nota);
  for (const motivo of unicos) limitada = Math.min(limitada, TOPE_DE[motivo]);
  return { nota: limitada, veredicto: etiquetaDesdeNota(limitada), motivos: unicos };
}

export function notaDeTrabajo(respuestas: RespuestasTrabajo, condicion = ""): number {
  const peso = PESOS_PREGUNTAS.trabajo;
  return notaEntera(
    peso.lugar * creditoLugar(respuestas.lugar) +
      peso.v1 * creditoV1(respuestas.v1) +
      peso.v2 * creditoNivel(respuestas.v2) +
      peso.v3 * creditoSi(respuestas.v3) +
      peso.v4 * creditoNo(respuestas.v4) +
      peso.t5 * creditoAccion(respuestas.t5) +
      peso.t6 * creditoEstado(respuestas.t6) +
      peso.t7 * creditoSi(respuestas.t7) +
      peso.t8 * creditoLugarPedido(respuestas.t8, condicion) +
      peso.t9 * creditoNo(respuestas.t9) +
      peso.t10 * creditoNivel(respuestas.t10),
  );
}

export function notaDeFactura(respuestas: RespuestasFactura): number {
  const peso = PESOS_PREGUNTAS.factura;
  return notaEntera(
    peso.f1 * creditoF1(respuestas.f1) +
      peso.f2 * creditoSi(respuestas.f2) +
      peso.f3 * creditoSi(respuestas.f3) +
      peso.f4 * creditoNivel(respuestas.f4) +
      peso.g1 * creditoGasto(respuestas.g1) +
      peso.g2 * creditoSi(respuestas.g2) +
      peso.g3 * creditoSi(respuestas.g3) +
      peso.g4 * creditoSi(respuestas.g4) +
      peso.g5 * creditoNivel(respuestas.g5),
  );
}

export function etiquetaDesdeNota(nota: number): Veredicto {
  if (nota >= UMBRAL_CUMPLIO) return "cumplió";
  if (nota >= UMBRAL_PARCIAL) return "parcial";
  return "insuficiente";
}

export function notaDeTexto(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= 100) return valor;
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!/^(100|[1-9]?\d)$/.test(limpio)) return null;
  return Number(limpio);
}

export function notaEntera(suma: number): number {
  if (!Number.isFinite(suma)) return 0;
  const redonda = Math.round(suma);
  if (redonda < 0) return 0;
  if (redonda > 100) return 100;
  return redonda;
}

function creditoNivel(indice: 0 | 1 | 2): number {
  if (indice === 2) return 1;
  if (indice === 1) return 0.5;
  return 0;
}

/**
 * What the vision reading has to show before the middle step of v2 and t10
 * can be scored as "all of it". The rest of the reading is ignored.
 */
export type LecturaParaTecho = {
  tipo: string | null;
  legible: boolean | null;
  faltantes: readonly string[];
  /**
   * Groq's match, already parsed onto the reading (`CoincideGroq`).
   * Absent, null, parcial, and no are not a match. Only the stored value si is.
   */
  coincide?: CoincideGroq | null;
};

/**
 * Points to add to notaDeTrabajo. Zero unless HYTO_MILE_TECHO_80 is on and the
 * reading is a legible work photo with an empty missing-items list. The match
 * can come from Laya (v1 es_lo_pedido) or from the reading's coincide field
 * when it is the stored value si. Only the middle step (index 1) is lifted to
 * full credit. Index 0 stays a real miss. Caps still apply to the sum.
 */
export function puntosTecho80(
  trabajo: RespuestasTrabajo | null | undefined,
  lectura: LecturaParaTecho | null | undefined,
  env: EntornoTecho = process.env,
): number {
  if (!mileTecho80Activo(env)) return 0;
  if (!trabajo || !lectura) return 0;
  if (lectura.tipo !== "trabajo" || lectura.legible !== true) return 0;
  if (!Array.isArray(lectura.faltantes) || lectura.faltantes.length > 0) return 0;
  if (trabajo.v1 !== "es_lo_pedido" && lectura.coincide !== "si") return 0;
  const peso = PESOS_PREGUNTAS.trabajo;
  let extra = 0;
  if (trabajo.v2 === 1) extra += peso.v2 / 2;
  if (trabajo.t10 === 1) extra += peso.t10 / 2;
  return extra;
}

function creditoSi(valor: boolean): number {
  return valor ? 1 : 0;
}

/** Full credit when the organizer did not ask for a place. The weight stays 12. */
function creditoLugarPedido(valor: boolean, condicion: string): number {
  if (!condicionPideLugar(condicion)) return 1;
  return creditoSi(valor);
}

function creditoNo(valor: boolean): number {
  return valor ? 0 : 1;
}

function creditoV1(valor: RespuestasTrabajo["v1"]): number {
  if (valor === "es_lo_pedido") return 1;
  if (valor === "no_se_puede_saber") return 0.5;
  return 0;
}

function creditoF1(valor: RespuestasFactura["f1"]): number {
  if (valor === "coincide_con_lo_pedido") return 1;
  if (valor === "no_se_ve") return 0.5;
  return 0;
}

function creditoEstado(valor: RespuestasTrabajo["t6"]): number {
  if (valor === "terminado" || valor === "no_aplica") return 1;
  if (valor === "a_medias") return 0.5;
  return 0;
}

function creditoLugar(valor: RespuestasTrabajo["lugar"]): number {
  return valor === "no_claro" ? 0 : 1;
}

function creditoAccion(valor: RespuestasTrabajo["t5"]): number {
  return valor === "otra_o_no_claro" ? 0 : 1;
}

function creditoGasto(valor: RespuestasFactura["g1"]): number {
  return valor === "otro_o_no_claro" ? 0 : 1;
}
