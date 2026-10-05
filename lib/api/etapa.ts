import { esBlobEjemplo } from "@/lib/db/semilla";
import type { EvidenciaFila, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import type { EtapaTarea } from "@/lib/integrante/tipos";

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
 * aprobada — paid, or the payment hash is already saved
 * rechazada — organizer asked for another photo (pending, with a real file)
 */
export function lineaDeEnvio(
  tarea: Pick<TareaFila, "estado" | "hashPago">,
  evidencia: Pick<EvidenciaFila, "blobId" | "creadaEn"> | null,
  veredicto: VeredictoFila | null,
): LineaEnvio {
  const etapa = etapaDe(tarea, evidencia, veredicto);
  const enviadaEn = etapa && evidencia?.creadaEn ? evidencia.creadaEn : null;
  return { etapa, enviadaEn };
}

/** Paid, or the release hash is already stored. The member cannot replace the photo. */
export function tareaCerrada(tarea: Pick<TareaFila, "estado" | "hashPago">): boolean {
  return tarea.estado === "pagado" || Boolean(tarea.hashPago?.trim());
}

function etapaDe(
  tarea: Pick<TareaFila, "estado" | "hashPago">,
  evidencia: Pick<EvidenciaFila, "blobId"> | null,
  veredicto: VeredictoFila | null,
): EtapaTarea | null {
  if (tareaCerrada(tarea)) return "aprobada";
  const real = Boolean(evidencia && !esBlobEjemplo(evidencia.blobId));
  if (tarea.estado === "pendiente" && real) return "rechazada";
  if (tarea.estado === "en revisión" && evidencia) {
    return veredicto ? "enviada_organizador" : "en_revision";
  }
  return null;
}
