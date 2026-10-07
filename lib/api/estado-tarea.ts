import type { EstadoTarea, EtapaTarea } from "@/lib/integrante/tipos";

export type EstadoCalculado = {
  /** Stored status. A file does not promote pending, and it does not mark the task rejected. */
  estado: EstadoTarea;
  /** A payment hash is stored and the task is not paid yet. */
  pagoPendiente: boolean;
  /** The organizer inbox only while the task is in review. */
  enBandeja: boolean;
  /** Pending, and Mile or the organizer stored an explicit rejection. */
  rechazada: boolean;
  etapa: EtapaTarea | null;
};

/**
 * One status for organizer Tasks, Inbox, Report, and the member task list.
 * Paid is the only approved stage. A hash without paid stays pending payment.
 * A pending task with a file is not rejected unless a rejection was stored.
 */
export function calcularEstadoTarea(entrada: {
  estado: string;
  hashPago?: string | null;
  evidencia?: { blobId: string } | null;
  veredicto?: { origen?: string | null } | null;
  rechazoExplicito?: boolean;
}): EstadoCalculado {
  const estado = estadoGuardado(entrada.estado);
  const hash = Boolean(entrada.hashPago?.trim());
  const pagoPendiente = hash && estado !== "pagado";
  const rechazada = estado === "pendiente" && entrada.rechazoExplicito === true && !pagoPendiente;
  let etapa: EtapaTarea | null = null;
  if (estado === "pagado") etapa = "aprobada";
  else if (rechazada) etapa = "rechazada";
  else if (estado === "en revisión" && entrada.evidencia) {
    etapa = entrada.veredicto ? "enviada_organizador" : "en_revision";
  }
  return {
    estado,
    pagoPendiente,
    enBandeja: estado === "en revisión",
    rechazada,
    etapa,
  };
}

function estadoGuardado(estado: string): EstadoTarea {
  if (estado === "en revisión" || estado === "pagado") return estado;
  return "pendiente";
}
