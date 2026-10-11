import { ID_PROYECTO_DEMO, esBlobEjemplo } from "@/lib/db/semilla";
import type { EvidenciaFila, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import type { EtapaTarea } from "@/lib/integrante/tipos";
import { leerRechazo } from "@/lib/revision/requisitos";
import { calcularEstadoTarea } from "./estado-tarea";

export type LineaEnvio = {
  etapa: EtapaTarea | null;
  /** ISO-8601 instant the latest photo was sent. Mailbox #058 calls this enviada_en. */
  enviadaEn: string | null;
};

/**
 * Member timeline from mailbox #058. Derived from the task, the latest file, and whether a
 * review row exists. No new columns.
 *
 * en_revision — photo saved, review not stored yet
 * enviada_organizador — review stored, so the organizer has the photo
 * aprobada — the task is paid
 * rechazada — a rejection was stored on a pending task
 */
export function lineaDeEnvio(
  tarea: Pick<TareaFila, "estado" | "hashPago"> & { rechazo?: string | null },
  evidencia: Pick<EvidenciaFila, "blobId" | "creadaEn"> | null,
  veredicto: VeredictoFila | null,
): LineaEnvio {
  const calculo = calcularEstadoTarea({
    estado: tarea.estado,
    hashPago: tarea.hashPago,
    evidencia,
    veredicto,
    rechazoExplicito: leerRechazo(tarea.rechazo ?? null) !== null,
  });
  const real = Boolean(evidencia && !esBlobEjemplo(evidencia.blobId));
  const enviadaEn = (calculo.etapa || real) && evidencia?.creadaEn ? evidencia.creadaEn : null;
  return { etapa: calculo.etapa, enviadaEn };
}

/** Paid, or the release hash is already stored. The member cannot replace the photo. */
export function tareaCerrada(tarea: Pick<TareaFila, "estado" | "hashPago">): boolean {
  return tarea.estado === "pagado" || Boolean(tarea.hashPago?.trim());
}


/**
 * The file that belongs to the task as it stands. A demo restart puts a demo task back to pending but
 * keeps the old file and its review: that is history from an earlier demo, not something this person sent.
 * Outside the demo, an upload always moves a task to review, so a pending task's file only counts when it
 * was sent back (a stored rejection).
 */
export function evidenciaVigente<E>(
  tarea: Pick<TareaFila, "proyectoId" | "estado" | "hashPago">,
  evidencia: E | null,
  rechazada: boolean,
): E | null {
  if (!evidencia) return null;
  const pendiente = calcularEstadoTarea({ estado: tarea.estado, hashPago: tarea.hashPago }).estado === "pendiente";
  if (tarea.proyectoId === ID_PROYECTO_DEMO && pendiente && !rechazada && !tarea.hashPago?.trim()) return null;
  return evidencia;
}
