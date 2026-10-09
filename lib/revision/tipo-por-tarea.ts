import type { TipoTarea } from "@/lib/integrante/tipos";

/**
 * The work-vs-receipt question path follows the task and Groq's evidence type
 * only when HYTO_MILE_TIPO_POR_TAREA is exactly "on".
 * Unset, empty, and anything else keep Laya's c1 label, including a near tie.
 */
export const HYTO_MILE_TIPO_POR_TAREA = "HYTO_MILE_TIPO_POR_TAREA";

/** NODE_ENV is listed so this accepts process.env without turning the flag on. */
export type EntornoTipoPorTarea = {
  HYTO_MILE_TIPO_POR_TAREA?: string;
  NODE_ENV?: string;
};

export function tipoPorTareaActivo(env: EntornoTipoPorTarea = process.env): boolean {
  const valor = (env.HYTO_MILE_TIPO_POR_TAREA ?? "off").trim().toLowerCase();
  return valor === "on";
}

export type ClaseCamino = "trabajo" | "factura" | "otra";

/**
 * Phrases written by contextoParaLaya. A missing line, or "not stated", stays null.
 * The receipt phrase matches esReciboEscrito.
 */
export function tipoGroqEscrito(texto: string): ClaseCamino | null {
  if (/Evidence type:\s*a receipt or an invoice\b/i.test(texto)) return "factura";
  if (/Evidence type:\s*work, a place, or a scene\b/i.test(texto)) return "trabajo";
  if (/Evidence type:\s*something other than\b/i.test(texto)) return "otra";
  return null;
}

/**
 * Which questionnaire to ask after c1 has been read. Used only when the switch is on.
 * "otra" stays "otra", so a something-else score is unchanged.
 * A receipt Groq already named stays on the invoice questions.
 * A work task that Groq also read as work never takes the invoice questions
 * (exam cases 17, 31, and 33).
 * A close c1 (MARGEN_CERCA) does not choose: the task type does, then Groq's work reading.
 * A reimbursement whose c1 is close stays on the invoice questions.
 * A c1 that is not close still chooses when the task and Groq do not agree on work.
 */
export function claseConTipoDeTarea(
  laya: ClaseCamino,
  entrada: {
    tipoTarea?: TipoTarea | null;
    texto: string;
    c1Cerca: boolean;
  },
): ClaseCamino {
  if (laya === "otra") return "otra";
  const groq = tipoGroqEscrito(entrada.texto);
  if (groq === "factura") return "factura";
  if (entrada.tipoTarea === "trabajo" && groq === "trabajo") return "trabajo";
  if (!entrada.c1Cerca) return laya;
  if (entrada.tipoTarea === "trabajo") return "trabajo";
  if (entrada.tipoTarea === "reembolso") return "factura";
  if (groq === "trabajo") return "trabajo";
  return laya;
}
