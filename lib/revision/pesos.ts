import type { Veredicto } from "@/lib/admin/tipos";

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
 * - t5 what was done: a named action = 1, otra_o_no_claro = 0
 * - t6 state: terminado = 1, a_medias = 0.5, sin_empezar = 0, no_claro = 0
 * - t7 tools or materials: yes = 1, no = 0
 * - t8 done at the requested place: yes = 1, no = 0
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
 * Classification "otra" does not use these weights. The grade is 0.
 *
 * A yes/no question gives full weight only to the answer that supports a valid
 * expense or a finished task. For "is something missing / unfinished", that
 * answer is no.
 *
 * Display bands, derived from the percentage. They do not approve a payment:
 * under 50 insuficiente, 50–79 parcial, 80–100 cumplió.
 *
 * Reimbursement safety cap (TOPE_NOTA_REEMBOLSO): if the amount is missing,
 * not a positive number, the date is missing, or the amount is over the task
 * cap, the grade cannot go above 40. That keeps the band at insuficiente.
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
export const UMBRAL_PARCIAL = 50;
export const UMBRAL_CUMPLIO = 80;

export type RespuestasNotaTrabajo = {
  lugar: "pared_o_superficie" | "stand_o_mesa" | "espacio_abierto" | "no_claro";
  v1: "es_lo_pedido" | "es_otra_cosa" | "no_se_puede_saber";
  v2: 0 | 1 | 2;
  v3: boolean;
  v4: boolean;
  t5: "pintar" | "limpiar" | "armar_o_montar" | "vender_o_atender" | "transportar" | "otra_o_no_claro";
  t6: "terminado" | "a_medias" | "sin_empezar" | "no_claro";
  t7: boolean;
  t8: boolean;
  t9: boolean;
  t10: 0 | 1 | 2;
};

export type RespuestasNotaFactura = {
  f1: "coincide_con_lo_pedido" | "otro_gasto" | "no_se_ve";
  f2: boolean;
  f3: boolean;
  f4: 0 | 1 | 2;
  g1: "transporte" | "comida_o_bebida" | "materiales" | "impresion_o_papeleria" | "otro_o_no_claro";
  g2: boolean;
  g3: boolean;
  g4: boolean;
  g5: 0 | 1 | 2;
};

export function notaDeTrabajo(respuestas: RespuestasNotaTrabajo): number {
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
      peso.t8 * creditoSi(respuestas.t8) +
      peso.t9 * creditoNo(respuestas.t9) +
      peso.t10 * creditoNivel(respuestas.t10),
  );
}

export function notaDeFactura(respuestas: RespuestasNotaFactura): number {
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

function creditoSi(valor: boolean): number {
  return valor ? 1 : 0;
}

function creditoNo(valor: boolean): number {
  return valor ? 0 : 1;
}

function creditoV1(valor: RespuestasNotaTrabajo["v1"]): number {
  if (valor === "es_lo_pedido") return 1;
  if (valor === "no_se_puede_saber") return 0.5;
  return 0;
}

function creditoF1(valor: RespuestasNotaFactura["f1"]): number {
  if (valor === "coincide_con_lo_pedido") return 1;
  if (valor === "no_se_ve") return 0.5;
  return 0;
}

function creditoEstado(valor: RespuestasNotaTrabajo["t6"]): number {
  if (valor === "terminado") return 1;
  if (valor === "a_medias") return 0.5;
  return 0;
}

function creditoLugar(valor: RespuestasNotaTrabajo["lugar"]): number {
  return valor === "no_claro" ? 0 : 1;
}

function creditoAccion(valor: RespuestasNotaTrabajo["t5"]): number {
  return valor === "otra_o_no_claro" ? 0 : 1;
}

function creditoGasto(valor: RespuestasNotaFactura["g1"]): number {
  return valor === "otro_o_no_claro" ? 0 : 1;
}
