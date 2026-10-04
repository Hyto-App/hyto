import { trabajoClaroActivo, type EntornoTrabajo } from "./trabajo-bandera";
import { decidirTrabajo, type DecisionTrabajo, type EntradaDecisionTrabajo } from "./trabajo-decision";

export type SalidaTrabajo<T> =
  | { modo: "existente"; resultado: T }
  | { modo: "trabajo"; resultado: T; decision: DecisionTrabajo };

/**
 * With the flag off, the existing verdict is returned as the same object.
 * The live review does not call this, so production stays on the current path.
 */
export function aplicarTrabajoSiActivo<T>(
  existente: T,
  entrada: EntradaDecisionTrabajo,
  env: EntornoTrabajo = process.env,
): SalidaTrabajo<T> {
  if (!trabajoClaroActivo(env)) return { modo: "existente", resultado: existente };
  return { modo: "trabajo", resultado: existente, decision: decidirTrabajo(entrada) };
}
