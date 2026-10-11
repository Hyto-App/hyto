import type { AccionCliente } from "@/lib/escrow/firmarCliente";
import { aUnidades } from "@/lib/escrow/saldo";
import { normalizarMonto } from "@/lib/admin/vista";

/**
 * «Bloquear K de N tareas» on the Tasks tab. Each task keeps its own Trustless Work contract:
 * this only runs the existing per-task lock (deploy, then fund) one task after another,
 * one Cavos signature per click, so every Cavos window opens from a user gesture.
 */
export type FilaLote = {
  id: string;
  estado: string;
  miembroId: string;
  /** The assigned person has a payout account (a `G…` on the task or on their own sign-in). */
  cuentaCobro: boolean;
  /** Contract already on the task, if any. */
  contrato: string | null;
  /** Balance read for that contract: true locked, false deployed but not funded, null unknown. */
  fondeado: boolean | null;
  /** The amount the lock would set aside. Null when it cannot be known yet (a reimbursement with no amount). */
  montoLote: string | null;
  /** What «Presupuesto sin bloquear» counts while the amount is unknown: the reimbursement cap. */
  topeLote?: string | null;
};

/** Locked: a contract whose balance is not known to be empty. Paid tasks count as done, not as locked. */
export function estaBloqueada(fila: Pick<FilaLote, "estado" | "contrato" | "fondeado">): boolean {
  if (fila.estado === "pagado") return false;
  return Boolean(fila.contrato) && fila.fondeado !== false;
}

/** Still waiting for its budget: not paid and not locked. */
export function sinBloquear(fila: Pick<FilaLote, "estado" | "contrato" | "fondeado">): boolean {
  return fila.estado !== "pagado" && !estaBloqueada(fila);
}

/** Ready for the bulk lock: unlocked, someone assigned, and that person can be paid. Demo skips the payout account. */
export function listaParaBloquear(fila: FilaLote, demo = false): boolean {
  if (!sinBloquear(fila)) return false;
  if (!fila.miembroId.trim()) return false;
  if (demo) return true;
  return fila.cuentaCobro && fila.montoLote !== null;
}

/** The signatures one task still needs. A deployed contract with no balance only needs the fund step. */
export function pasosDeTarea(fila: Pick<FilaLote, "contrato" | "fondeado">): AccionCliente[] {
  return fila.contrato && fila.fondeado === false ? ["fondear"] : ["desplegar", "fondear"];
}

function suma(montos: (string | null)[]): string {
  let total = 0n;
  for (const monto of montos) {
    const unidades = aUnidades(normalizarMonto(monto ?? "") ?? "0");
    if (unidades !== null) total += unidades;
  }
  // aUnidades works in 7-decimal stroops; two decimals are enough for a dollar amount on screen.
  const centavos = total / 100000n;
  return `${centavos / 100n}.${String(centavos % 100n).padStart(2, "0")}`;
}

export type ResumenLote = { monto: string; n: number; k: number; listas: string[] };

/** «Presupuesto sin bloquear · US$X para N tareas» and «Bloquear K de N tareas». */
export function resumenLote(filas: FilaLote[], demo = false): ResumenLote {
  const pendientes = filas.filter(sinBloquear);
  const listas = pendientes.filter((fila) => listaParaBloquear(fila, demo)).map((fila) => fila.id);
  return { monto: suma(pendientes.map((fila) => fila.montoLote ?? fila.topeLote ?? null)), n: pendientes.length, k: listas.length, listas };
}

export type TareaEnCola = { id: string; pasos: AccionCliente[]; contrato: string | null };

export type EstadoLote = {
  cola: TareaEnCola[];
  /** Index in `cola` of the task the next click signs. */
  indice: number;
  /** Index in that task's `pasos`. */
  paso: number;
  /** True while a signature is on screen or being sent. */
  firmando: boolean;
  hechas: string[];
  /** Failed or closed signatures, with what they still need for Retry. */
  fallidas: Record<string, TareaEnCola>;
};

export function iniciarLote(filas: FilaLote[], ids: readonly string[]): EstadoLote {
  const cola = ids.flatMap((id) => {
    const fila = filas.find((item) => item.id === id);
    return fila ? [{ id, pasos: pasosDeTarea(fila), contrato: fila.contrato }] : [];
  });
  return { cola, indice: 0, paso: 0, firmando: false, hechas: [], fallidas: {} };
}

export function loteTerminado(estado: EstadoLote | null): boolean {
  return !estado || estado.indice >= estado.cola.length;
}

/** What the next click signs, or null when the queue is done or a signature is already open. */
export function siguientePaso(estado: EstadoLote | null): { tareaId: string; accion: AccionCliente; contrato: string | null } | null {
  if (!estado || estado.firmando || loteTerminado(estado)) return null;
  const tarea = estado.cola[estado.indice]!;
  const accion = tarea.pasos[estado.paso];
  if (!accion) return null;
  return { tareaId: tarea.id, accion, contrato: tarea.contrato };
}

export function empezarFirma(estado: EstadoLote): EstadoLote {
  return { ...estado, firmando: true };
}

/**
 * After one signature. A success moves to the task's next signature or to the next task.
 * A failure (rejected, closed, or refused by the server) parks that task for Retry and moves on.
 */
export function terminarPaso(
  estado: EstadoLote,
  resultado: { ok: true; contrato: string | null } | { ok: false; contrato: string | null },
): EstadoLote {
  const tarea = estado.cola[estado.indice];
  if (!tarea) return { ...estado, firmando: false };
  const contrato = resultado.contrato ?? tarea.contrato;
  const cola = estado.cola.map((item, indice) => (indice === estado.indice ? { ...item, contrato } : item));
  if (resultado.ok) {
    if (estado.paso + 1 < tarea.pasos.length) return { ...estado, cola, paso: estado.paso + 1, firmando: false };
    const fallidas = { ...estado.fallidas };
    delete fallidas[tarea.id];
    return { ...estado, cola, indice: estado.indice + 1, paso: 0, firmando: false, hechas: [...estado.hechas, tarea.id], fallidas };
  }
  // Deploy went through but fund did not: Retry only needs the fund signature.
  const resto = tarea.pasos.slice(estado.paso);
  const pendiente: TareaEnCola = { id: tarea.id, contrato, pasos: contrato && resto[0] === "fondear" ? ["fondear"] : resto };
  return {
    ...estado,
    cola,
    indice: estado.indice + 1,
    paso: 0,
    firmando: false,
    fallidas: { ...estado.fallidas, [tarea.id]: pendiente },
  };
}

/**
 * Retry puts the failed task back in the queue. Between tasks it goes first, so the click that asked
 * for it signs it; in the middle of another task's signatures it waits at the end, so that task keeps its place.
 */
export function reintentarTarea(estado: EstadoLote, tareaId: string): EstadoLote {
  const pendiente = estado.fallidas[tareaId];
  if (!pendiente || estado.firmando) return estado;
  const fallidas = { ...estado.fallidas };
  delete fallidas[tareaId];
  if (estado.paso > 0 && !loteTerminado(estado)) return { ...estado, cola: [...estado.cola, pendiente], fallidas };
  const restantes = estado.cola.slice(estado.indice);
  const hechas = estado.cola.slice(0, estado.indice);
  return { ...estado, cola: [...hechas, pendiente, ...restantes], paso: 0, fallidas };
}

/** «Bloqueando tarea i de n · firma f de g»: counts the tasks in this run and the signatures of the current one. */
export function progresoLote(
  estado: EstadoLote | null,
): { i: number; n: number; f: number; g: number; pct: number } | null {
  if (!estado || loteTerminado(estado)) return null;
  const tarea = estado.cola[estado.indice]!;
  // The thin bar: signatures already behind this one (signed or skipped by a failure) out of all in the run.
  const total = estado.cola.reduce((suma, item) => suma + item.pasos.length, 0);
  const atras = estado.cola.slice(0, estado.indice).reduce((suma, item) => suma + item.pasos.length, 0) + estado.paso;
  const pct = total > 0 ? Math.round((atras / total) * 100) : 0;
  return { i: estado.indice + 1, n: estado.cola.length, f: estado.paso + 1, g: tarea.pasos.length, pct };
}
