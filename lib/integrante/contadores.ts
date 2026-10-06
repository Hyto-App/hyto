import type { Tarea } from "./tipos";

/** Photos waiting for review. This is a count of tasks, not the sum of their amounts. */
export function contarEnRevision(tareas: Pick<Tarea, "estado">[]): number {
  return tareas.filter((tarea) => tarea.estado === "en revisión").length;
}
