import { reciboClaroActivo, type EntornoRecibo } from "./recibo-bandera";
import { decidirRecibo, type DecisionRecibo, type EntradaDecision } from "./recibo-decision";

export type SalidaRecibo<T> =
  | { modo: "existente"; resultado: T }
  | { modo: "recibo"; resultado: T; decision: DecisionRecibo };

/**
 * With the flag off, the existing verdict is returned as the same object.
 * The live review does not call this, so production stays on the current path.
 */
export function aplicarReciboSiActivo<T>(
  existente: T,
  entrada: EntradaDecision,
  env: EntornoRecibo = process.env,
): SalidaRecibo<T> {
  if (!reciboClaroActivo(env)) return { modo: "existente", resultado: existente };
  return { modo: "recibo", resultado: existente, decision: decidirRecibo(entrada) };
}
