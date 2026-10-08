import type { Fotos } from "@/lib/blob/fotos";
import type { Almacen } from "@/lib/db/almacen";
import { esBlobEjemplo } from "@/lib/db/semilla";
import { enlacePago } from "@/lib/admin/vista";
import { contextoDesdeEntorno, revisar } from "@/lib/revision/revisar";
import { contextoParaRevision } from "./contexto-evento";
import { organizacionDeEvento } from "./tipo-cuenta";
import { guardarFalloDeRevision, guardarRevision } from "./evidencias";
import { conciliarPagoPendiente } from "./firma";
import { rechazoPublico, revisionPublica } from "./tareas";
import { leerRequisitos } from "@/lib/revision/requisitos";
import type { Idioma } from "@/lib/ui/idioma";
import { tareaAdmin } from "./informe";
import { baseNoLista, json } from "./json";
import { HOLGURA_TOPE_MS, MARGEN_GUARDADO_MS } from "./plazo-revision";
import { PRESUPUESTO_REVISION_MS } from "@/lib/revision/reintento";

const ESPERA_REVISION_MS = 30_000;

/** Must equal `maxDuration` in `app/api/revision/[id]/route.ts`, in milliseconds. */
export const MAX_DURACION_REVISION_MS = 60_000;
/** Below this, Groq and Laya cannot finish, so a forced review is not started. */
export const MIN_PRESUPUESTO_FORZADO_MS = 5_000;
export const AVISO_SIN_TIEMPO = "There isn't enough time left to review this photo. Try again in a moment.";

/** What is left for `revisar()` once the verdict write and a small slack are set aside. */
export function presupuestoForzado(inicio: number, ahora = Date.now()): number {
  const restante = inicio + MAX_DURACION_REVISION_MS - MARGEN_GUARDADO_MS - HOLGURA_TOPE_MS - ahora;
  return Math.max(0, Math.min(PRESUPUESTO_REVISION_MS, restante));
}
const revisionEnCurso = new Set<string>();
const revisionEsperaHasta = new Map<string, number>();

export function reservarRevision(tareaId: string, ahora = Date.now()): boolean {
  if (revisionEnCurso.has(tareaId)) return false;
  if ((revisionEsperaHasta.get(tareaId) ?? 0) > ahora) return false;
  revisionEnCurso.add(tareaId);
  return true;
}

export function liberarRevision(tareaId: string, ahora = Date.now()): void {
  revisionEnCurso.delete(tareaId);
  revisionEsperaHasta.set(tareaId, ahora + ESPERA_REVISION_MS);
}

export function reiniciarCandadosRevision(): void {
  revisionEnCurso.clear();
  revisionEsperaHasta.clear();
}

export async function leerRevisionHttp(
  almacen: Almacen,
  fotos: Fotos | null,
  tareaId: string,
  forzar = false,
  wallet = "",
  idioma: Idioma = "en",
  /** When the request arrived (epoch ms). Unset keeps the default review budget. */
  inicio?: number,
): Promise<Response> {
  try {
    const tarea = await almacen.leerTarea(tareaId);
    if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
    if (forzar && (tarea.estado === "pagado" || Boolean(tarea.contratoEscrow?.trim()))) {
      return json({ aviso: "This task can no longer be reviewed." }, 409);
    }
    const evidencia = await almacen.ultimaEvidencia(tareaId);
    const blobReal = evidencia !== null && !esBlobEjemplo(evidencia.blobId);
    const veredicto = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
    const puedeForzar = !veredicto || veredicto.origen === "error";
    if (forzar && evidencia && blobReal && fotos && puedeForzar) {
      if (inicio !== undefined && presupuestoForzado(inicio) < MIN_PRESUPUESTO_FORZADO_MS) {
        return json({ aviso: AVISO_SIN_TIEMPO }, 503);
      }
      let reservado = false;
      if (forzar) {
        if (!reservarRevision(tareaId)) return json({ aviso: "Wait a moment before reviewing again." }, 429);
        reservado = true;
      }
      try {
        const foto = await fotos.leer(evidencia.blobId);
        const evento = await contextoParaRevision(almacen, tarea.proyectoId);
        const organizacion = await organizacionDeEvento(almacen, tarea.proyectoId);
        const presupuestoMs = inicio === undefined ? undefined : presupuestoForzado(inicio);
        const resultado = await revisar(tarea, foto, { ...contextoDesdeEntorno(), evento, organizacion, idioma, presupuestoMs });
        await guardarRevision(almacen, evidencia.id, tarea.id, resultado);
      } catch (error) {
        await guardarFalloDeRevision(almacen, evidencia.id, tarea.id, error);
      } finally {
        if (reservado) liberarRevision(tareaId);
      }
    }
    let actual = (await almacen.leerTarea(tareaId)) ?? tarea;
    if (await conciliarPagoPendiente(almacen, actual).catch(() => false)) {
      actual = (await almacen.leerTarea(tareaId)) ?? actual;
    }
    const vista = await tareaAdmin(almacen, actual);
    const fila = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
    return json({
      tarea: vista,
      requisitos: leerRequisitos(actual.requisitos),
      rechazo: rechazoPublico(actual),
      revision: revisionPublica(actual, fila),
      foto: evidencia ? `/api/evidencias/${evidencia.id}/foto` : null,
      enlacePago: enlacePago(vista.hashPago),
      contratoEscrow: actual.contratoEscrow,
      walletCobro: actual.walletCobro,
      wallet,
    });
  } catch {
    return baseNoLista();
  }
}
