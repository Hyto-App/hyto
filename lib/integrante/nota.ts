import type { Veredicto } from "@/lib/admin/tipos";
import { etiquetaDesdeNota } from "@/lib/revision/pesos";
import type { Tarea } from "./tipos";

export const FRASE_PAGO = "Your organizer makes the final call";

/** A real grade is an integer from 0 to 100. The band follows that number. */
export function notaDeTarea(tarea: Pick<Tarea, "nota">): { nota: number; veredicto: Veredicto } | null {
  const nota = tarea.nota;
  if (typeof nota !== "number" || !Number.isInteger(nota) || nota < 0 || nota > 100) return null;
  return { nota, veredicto: etiquetaDesdeNota(nota) };
}
