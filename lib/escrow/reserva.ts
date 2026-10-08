import { normalizarMonto } from "@/lib/admin/vista";
import type { TareaFila } from "@/lib/db/tipos";
import { esContrato, esCuenta } from "./cuerpos";
import { montoDeTarea } from "./desplegar";
import { cifraConfirmada } from "./monto";

export const AVISO_SIN_PRESUPUESTO = "The organizer has to lock this budget before you start.";
export const AVISO_PRESUPUESTO_VACIO = "The budget is not locked yet. Ask the organizer to finish locking it.";
export const AVISO_PRESUPUESTO_DESCONOCIDO = "We couldn't confirm the locked budget yet. Try again in a moment.";
export const AVISO_SOLO_TRABAJADOR = "Only the person assigned to this task can mark it or open a dispute.";
export const AVISO_MARCA_PENDIENTE = "The worker has to mark this milestone before it can be paid.";
export const AVISO_MARCA_DESCONOCIDA = "We couldn't confirm that the worker marked this milestone. Try again in a moment.";
export const AVISO_PAGO_PARCIAL =
  "Trustless Work releases the whole locked milestone. This receipt is under that amount, so the payout has to go through a dispute. The platform resolver signs the split. Mile does not sign.";

export type MotivoReserva = "off" | "ready" | "no-wallet" | "already" | "paid" | "no-amount";

export type PlanReserva = {
  reservar: boolean;
  motivo: MotivoReserva;
};

/** Who may prepare the action. "either" means the worker or the organizer. */
export type ActorEscrow = "organizer" | "worker" | "either" | "resolver";

export function actorDe(accion: string, proteger: boolean): ActorEscrow {
  if (accion === "resolver") return "resolver";
  if (!proteger) return "organizer";
  if (accion === "marcar") return "worker";
  if (accion === "disputar") return "either";
  return "organizer";
}

/**
 * With protection on, the worker's wallet is the service provider.
 * The organizer stays the approver and the release signer.
 */
export function proveedorDe(organizador: string, receptor: string, proteger: boolean): string {
  return proteger ? receptor : organizador;
}

export function idEngagement(tareaId: string, proteger: boolean): string {
  return proteger ? `hyto-v2-${tareaId}` : `hyto-${tareaId}`;
}

/** Amount locked before the work. A reimbursement locks its cap, not a later receipt. */
export function montoAReservar(tarea: Pick<TareaFila, "tipo" | "monto" | "tope">): number | null {
  if (tarea.tipo !== "reembolso") return montoDeTarea(tarea as TareaFila, null);
  const limite = normalizarTope(tarea.tope, tarea.monto);
  if (!limite) return null;
  const cifra = Number(limite);
  if (!(cifra > 0) || !Number.isFinite(cifra)) return null;
  return cifra;
}

export function planReserva(entrada: {
  proteger: boolean;
  walletCobro: string;
  contrato: string | null;
  estado: string;
  monto: number | null;
}): PlanReserva {
  if (!entrada.proteger) return { reservar: false, motivo: "off" };
  if (entrada.estado === "pagado") return { reservar: false, motivo: "paid" };
  if (esContrato(entrada.contrato ?? "")) return { reservar: false, motivo: "already" };
  if (!esCuenta(entrada.walletCobro)) return { reservar: false, motivo: "no-wallet" };
  if (entrada.monto === null || !(entrada.monto > 0)) return { reservar: false, motivo: "no-amount" };
  return { reservar: true, motivo: "ready" };
}

/** A direct release pays the whole milestone. A smaller receipt has to be split by the resolver. */
export function puedeLiberarDirecto(
  tarea: Pick<TareaFila, "tipo" | "monto" | "tope"> & { montoConfirmado?: string | null },
  proteger: boolean,
): boolean {
  if (!proteger || tarea.tipo !== "reembolso") return true;
  const tope = montoAReservar(tarea);
  const confirmado = cifraConfirmada(tarea.montoConfirmado, tarea.tope, tarea.monto);
  if (tope === null || confirmado === null) return false;
  return Math.round(tope * 100) === Math.round(confirmado * 100);
}

export function evidenciaDeHito(evidenciaId: string): string {
  return `hyto-evidence:${evidenciaId}`.slice(0, 500);
}

const ESTADOS_MARCADOS = new Set(["completed", "complete", "done"]);

/** True only after the worker marks the milestone. A default or dispute status does not count. */
export function hitoMarcadoDe(json: unknown): boolean {
  const escrow = escrowDe(json);
  if (!escrow) return false;
  const hitos = Array.isArray(escrow.milestones) ? escrow.milestones : [];
  const hito = hitos[0];
  if (!hito || typeof hito !== "object") return false;
  const datos = hito as Record<string, unknown>;
  const estado = typeof datos.status === "string" ? datos.status.trim().toLowerCase() : "";
  const evidencia = typeof datos.evidence === "string" ? datos.evidence.trim() : "";
  return evidencia.length > 0 || ESTADOS_MARCADOS.has(estado);
}

export function balancePositivo(json: unknown): boolean | null {
  const escrow = escrowDe(json);
  if (!escrow) return null;
  const balance = escrow.balance;
  if (typeof balance === "number") return Number.isFinite(balance) && balance > 0;
  if (typeof balance === "string" && balance.trim()) {
    const cifra = Number(balance);
    if (!Number.isFinite(cifra)) return null;
    return cifra > 0;
  }
  return null;
}

function escrowDe(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object") return null;
  const raiz = json as Record<string, unknown>;
  const anidado = raiz.escrow;
  if (anidado && typeof anidado === "object") return anidado as Record<string, unknown>;
  return raiz;
}

function normalizarTope(tope: string | null, presupuesto: string): string | null {
  return normalizarMonto(tope ?? "") ?? normalizarMonto(presupuesto);
}
