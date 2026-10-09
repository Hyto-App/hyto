import { normalizarMonto } from "@/lib/admin/vista";
import { aUnidades } from "@/lib/escrow/saldo";

/**
 * The amount that would be locked, only when this edit raises it.
 * A reimbursement uses the cap. A work task uses the amount. Null when it does not go up.
 */
export function montoBloqueable(
  tarea: { tipo: string; monto: string; tope: string | null },
  cambio: { monto?: string | null; tope?: string | null },
): string | null {
  const anterior = normalizarMonto(tarea.tipo === "reembolso" ? (tarea.tope ?? tarea.monto) : tarea.monto);
  const propuesto = tarea.tipo === "reembolso" ? cambio.tope : cambio.monto;
  if (typeof propuesto !== "string" || !anterior) return null;
  const siguiente = normalizarMonto(propuesto);
  if (!siguiente) return null;
  const antes = aUnidades(anterior);
  const despues = aUnidades(siguiente);
  if (antes === null || despues === null || despues <= antes) return null;
  return siguiente;
}
