import { esBlobEjemplo } from "@/lib/db/semilla";
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
 *
 * enviadaEn is the current send only. A pending task (nothing sent yet, or another photo was
 * asked for) has no current send, so an older file's clock does not become "you sent this".
 * An example photo is not a send either.
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
  const ciclo =
    calculo.pagoPendiente ||
    calculo.etapa === "en_revision" ||
    calculo.etapa === "enviada_organizador" ||
    calculo.etapa === "aprobada";
  const enviadaEn = real && ciclo && evidencia?.creadaEn ? evidencia.creadaEn : null;
  return { etapa: calculo.etapa, enviadaEn };
}

/** Paid, or the release hash is already stored. The member cannot replace the photo. */
export function tareaCerrada(tarea: Pick<TareaFila, "estado" | "hashPago">): boolean {
  return tarea.estado === "pagado" || Boolean(tarea.hashPago?.trim());
}

