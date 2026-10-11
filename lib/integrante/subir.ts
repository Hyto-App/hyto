import { agruparPorEvento, ordenarPorPago, type OrdenTareas } from "@/lib/integrante/orden-pago";
import type { Tarea } from "@/lib/integrante/tipos";

/** `/mis-tareas?subir=1` means "take me to the evidence upload of my next task". */
export const CONSULTA_SUBIR = "subir";
export const RUTA_SUBIR_EVIDENCIA = `/mis-tareas?${CONSULTA_SUBIR}=1`;

/** The same task Mis tareas opens first (the first pending card in the list order), or null when nothing is pending. */
export function tareaParaSubir(tareas: Tarea[], orden: OrdenTareas = "defecto"): string | null {
  const grupos = agruparPorEvento(ordenarPorPago(tareas, orden), orden === "defecto" ? "unir" : "seguir");
  return grupos.flatMap((grupo) => grupo.tareas).find((tarea) => tarea.estado === "pendiente")?.id ?? null;
}
