import { enlacePago } from "@/lib/admin/vista";
import type { Proyecto, ProyectoMiembro, TareaFila } from "@/lib/db/tipos";
import { esEventoDePrueba, esTareaDemo } from "./prueba";

/**
 * Profile figures (Aang's rules, proposal v1, 10 Oct 2026):
 * - Only tasks a person approved and paid count. Mile's grade never counts:
 *   a task is `pagado` only after the organizer signs the release.
 * - Retries after a Mile error do not count against the person. Only the organizer's
 *   "ask for another photo" is stored (`tarea_cambios_pedidos`), so only that is a change.
 * - Tasks an organizer assigned to themselves in their own event do not count.
 * - Demo and test events do not count (`esEventoDePrueba`).
 */

export type EvidenciaResumen = { creadaEn: string; montoConfirmado: string | null } | null;

export type TareaHistorial = {
  tareaId: string;
  titulo: string;
  evento: string;
  /** ISO date of the last photo sent for the task, else the event date. */
  fecha: string | null;
  /** Dollar amount paid. Null when the person hides amounts. */
  monto: string | null;
  /** stellar.expert testnet link to the release, when the hash is a real one. */
  enlace: string | null;
};

export type CifrasPerfil = {
  tareasHechas: number;
  eventos: number;
  /** Whole percent of counted tasks approved with no change asked. Null with no tasks. */
  aprobadasSinCambios: number | null;
  historial: TareaHistorial[];
};

export type EntradaCifras = {
  usuarioId: string;
  proyectos: Proyecto[];
  tareas: TareaFila[];
  /** Every membership row, or at least the person's own. Used to spot an organizer's own event. */
  miembros: ProyectoMiembro[];
  evidencias?: Record<string, EvidenciaResumen>;
  cambios?: Record<string, number>;
  mostrarMontos?: boolean;
};

/** True when this paid task counts on the profile of the person it is assigned to. */
export function tareaCuenta(
  tarea: TareaFila,
  proyecto: Proyecto | undefined,
  miembros: readonly ProyectoMiembro[],
): boolean {
  const persona = tarea.miembroId.trim();
  if (!persona) return false;
  if (tarea.estado !== "pagado") return false;
  if (esTareaDemo(tarea)) return false;
  if (!proyecto || esEventoDePrueba(proyecto)) return false;
  if (proyecto.organizadorId === persona) return false;
  const organizaEse = miembros.some(
    (miembro) => miembro.proyectoId === proyecto.id && miembro.usuarioId === persona && miembro.rol === "organizer",
  );
  return !organizaEse;
}

/** Tasks that count for this person, newest first when the evidence dates are known. */
export function tareasQueCuentan(
  usuarioId: string,
  proyectos: readonly Proyecto[],
  tareas: readonly TareaFila[],
  miembros: readonly ProyectoMiembro[],
): TareaFila[] {
  const porId = new Map(proyectos.map((proyecto) => [proyecto.id, proyecto]));
  return tareas.filter((tarea) => tarea.miembroId === usuarioId && tareaCuenta(tarea, porId.get(tarea.proyectoId), miembros));
}

function montoPagado(tarea: TareaFila, evidencia: EvidenciaResumen | undefined): string {
  if (tarea.tipo === "reembolso" && evidencia?.montoConfirmado?.trim()) return evidencia.montoConfirmado.trim();
  return tarea.monto;
}

export function calcularCifras(entrada: EntradaCifras): CifrasPerfil {
  const porId = new Map(entrada.proyectos.map((proyecto) => [proyecto.id, proyecto]));
  const cuentan = tareasQueCuentan(entrada.usuarioId, entrada.proyectos, entrada.tareas, entrada.miembros);
  const eventos = new Set(cuentan.map((tarea) => tarea.proyectoId));
  const sinCambios = cuentan.filter((tarea) => (entrada.cambios?.[tarea.id] ?? 0) === 0).length;
  const historial = cuentan
    .map((tarea): TareaHistorial => {
      const evidencia = entrada.evidencias?.[tarea.id];
      const proyecto = porId.get(tarea.proyectoId);
      return {
        tareaId: tarea.id,
        titulo: tarea.titulo,
        evento: proyecto?.nombre ?? "",
        fecha: evidencia?.creadaEn ?? proyecto?.creadoEn ?? null,
        monto: entrada.mostrarMontos ? montoPagado(tarea, evidencia) : null,
        enlace: enlacePago(tarea.hashPago),
      };
    })
    .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
  return {
    tareasHechas: cuentan.length,
    eventos: eventos.size,
    aprobadasSinCambios: cuentan.length === 0 ? null : Math.round((sinCambios / cuentan.length) * 100),
    historial,
  };
}
