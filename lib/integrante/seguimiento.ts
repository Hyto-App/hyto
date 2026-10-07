import type { Tarea } from "./tipos";

/** Ask again every 3 s, for at most 60 s, so a slow review can still land before the screen gives up. */
export const INTERVALO_SEGUIMIENTO_MS = 3000;
export const LIMITE_SEGUIMIENTO_MS = 60000;

/** The task waits for Mile: sent, but no grade has arrived yet. A stored failure is not "still checking". */
export function esperaRevision(tarea: Pick<Tarea, "estado" | "nota" | "revisionFallida">): boolean {
  if (tarea.revisionFallida) return false;
  return tarea.estado === "en revisión" && (tarea.nota === null || tarea.nota === undefined);
}

/**
 * The photo was sent at least the follow window ago and still has no grade.
 * A missing timestamp does not count: the screen then uses its own clock.
 */
export function plazoRevisionVencido(tarea: Pick<Tarea, "enviadaEn" | "nota">, ahora = Date.now()): boolean {
  if (typeof tarea.nota === "number") return false;
  if (typeof tarea.enviadaEn !== "string" || !tarea.enviadaEn) return false;
  const enviada = Date.parse(tarea.enviadaEn);
  if (!Number.isFinite(enviada)) return false;
  return ahora - enviada >= LIMITE_SEGUIMIENTO_MS;
}

/** How long this screen should keep polling. A retry started here gets a fresh window. */
export function topeSeguimientoMs(enviadaEn: string | null | undefined, ahora: number, esperaLocal: boolean): number {
  if (esperaLocal) return LIMITE_SEGUIMIENTO_MS;
  if (typeof enviadaEn !== "string" || !enviadaEn) return LIMITE_SEGUIMIENTO_MS;
  const enviada = Date.parse(enviadaEn);
  if (!Number.isFinite(enviada)) return LIMITE_SEGUIMIENTO_MS;
  return Math.max(0, LIMITE_SEGUIMIENTO_MS - (ahora - enviada));
}

type TareaReintento = Pick<Tarea, "nota" | "revisionFallida" | "enviadaEn" | "estado" | "etapa" | "hashPago">;

/**
 * Leave "Checking" and offer another file.
 * A stored failure does that immediately. So does a photo that is already older than the follow window,
 * unless this screen just sent it and is using its own clock.
 */
export function mostrarReintento(
  tarea: TareaReintento,
  opciones: { esperaLocal: boolean; esperaAgotada: boolean; ahora?: number },
): boolean {
  if (typeof tarea.nota === "number") return false;
  if (tarea.estado === "pagado" || tarea.etapa === "aprobada" || Boolean(tarea.hashPago?.trim())) return false;
  if (tarea.revisionFallida === true) return true;
  if (opciones.esperaAgotada) return true;
  if (opciones.esperaLocal) return false;
  return plazoRevisionVencido(tarea, opciones.ahora ?? Date.now());
}

/** Keep asking a little after the retry appears, so a late grade can still land. */
const TOPE_LISTA_MS = LIMITE_SEGUIMIENTO_MS * 2;

/**
 * My tasks keeps asking while a photo still has no grade and this screen has not
 * been watching it for two follow windows. The retry message uses the one-minute mark.
 */
export function seguirEnLista(
  tareas: ReadonlyArray<Pick<Tarea, "id" | "estado" | "nota" | "revisionFallida" | "enviadaEn">>,
  ahora: number,
  vistosEn: ReadonlyMap<string, number>,
): boolean {
  return tareas.some((tarea) => {
    if (!esperaRevision(tarea)) return false;
    const visto = vistosEn.get(tarea.id);
    if (visto === undefined) return true;
    return ahora - visto < TOPE_LISTA_MS;
  });
}

/** Same retry rule as the upload screen, for a card on My tasks. */
export function reintentoEnLista(tarea: TareaReintento, ahora: number, vistoEn: number | undefined): boolean {
  const sinFecha = typeof tarea.enviadaEn !== "string" || !tarea.enviadaEn;
  const esperaAgotada = sinFecha && vistoEn !== undefined && ahora - vistoEn >= LIMITE_SEGUIMIENTO_MS;
  return mostrarReintento(tarea, { esperaLocal: false, esperaAgotada, ahora });
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
