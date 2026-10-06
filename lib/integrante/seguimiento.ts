import type { Tarea } from "./tipos";

/** Ask again every 3 s, for at most 60 s, so a slow review can still land before the screen gives up. */
export const INTERVALO_SEGUIMIENTO_MS = 3000;
export const LIMITE_SEGUIMIENTO_MS = 60000;

/** The task waits for Mile: sent, but no grade has arrived yet. */
export function esperaRevision(tarea: Pick<Tarea, "estado" | "nota">): boolean {
  return tarea.estado === "en revisión" && (tarea.nota === null || tarea.nota === undefined);
}

/** Keep polling only while the grade is missing, the state has not changed and the 60 s are not spent. */
export function seguirConsultando(
  inicial: Pick<Tarea, "estado" | "nota">,
  actual: Pick<Tarea, "estado" | "nota">,
  transcurridoMs: number,
): boolean {
  if (actual.estado !== inicial.estado) return false;
  return esperaRevision(actual) && transcurridoMs < LIMITE_SEGUIMIENTO_MS;
}
