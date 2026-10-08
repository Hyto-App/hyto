import type { Almacen, CambioTarea } from "@/lib/db/almacen";
import type { TareaFila } from "@/lib/db/tipos";
import { esContrato, esCuenta } from "@/lib/escrow/cuerpos";
import { tareaCerrada } from "./etapa";

/** Why Lock budget has no payout account for this task yet. */
export type FaltaCobro = "asignar" | "cuenta";

/**
 * Where the escrow pays this task. Always the assigned person's account: the one stored on the task,
 * then their newest sign-in, then the account their other tasks already pay.
 */
export async function cuentaDeCobro(
  almacen: Almacen,
  tarea: Pick<TareaFila, "id" | "miembroId" | "walletCobro">,
): Promise<string | null> {
  const guardada = tarea.walletCobro.trim();
  if (esCuenta(guardada)) return guardada;
  const miembro = tarea.miembroId.trim();
  if (!miembro) return null;
  const deSesion = (await almacen.walletDeUsuario(miembro))?.trim() ?? "";
  if (esCuenta(deSesion)) return deSesion;
  return cuentaDeOtrasTareas(almacen, tarea.id, miembro);
}

// Signing out deletes the session row, so a person who was already paid can have no session left.
async function cuentaDeOtrasTareas(almacen: Almacen, tareaId: string, miembro: string): Promise<string | null> {
  const otras = (await almacen.listarTareas()).filter(
    (otra) => otra.id !== tareaId && otra.miembroId.trim() === miembro && esCuenta(otra.walletCobro.trim()),
  );
  const distintas = new Set(otras.map((otra) => otra.walletCobro.trim()));
  if (distintas.size <= 1) return [...distintas][0] ?? null;
  // The upload writes wallet_cobro from the session, so the newest photo carries the newest account.
  let elegida: { wallet: string; cuando: string } | null = null;
  for (const otra of otras) {
    const cuando = (await almacen.ultimaEvidencia(otra.id))?.creadaEn ?? "";
    if (!elegida || cuando > elegida.cuando) elegida = { wallet: otra.walletCobro.trim(), cuando };
  }
  return elegida?.wallet ?? null;
}

/** The stored account belongs to the assigned person, so someone else taking the task starts without it. */
export function cambioDeMiembro(tarea: Pick<TareaFila, "miembroId">, miembroId: string): CambioTarea {
  return miembroId === tarea.miembroId ? { miembroId } : { miembroId, walletCobro: "" };
}

/** Null when Lock budget can pay someone, or when the budget is already locked or paid. */
export async function faltaCobroDe(almacen: Almacen, tarea: TareaFila): Promise<FaltaCobro | null> {
  if (tareaCerrada(tarea) || esContrato(tarea.contratoEscrow?.trim() ?? "")) return null;
  if (await cuentaDeCobro(almacen, tarea)) return null;
  return tarea.miembroId.trim() ? "cuenta" : "asignar";
}

/**
 * Opening their tasks stores the person's account on each one that is still open, so the organizer
 * can lock the budget after that person signs out.
 */
export async function guardarCobroPropio(
  almacen: Almacen,
  tareas: TareaFila[],
  usuarioId: string,
  wallet: string,
): Promise<TareaFila[]> {
  const cuenta = wallet.trim();
  if (!usuarioId || !esCuenta(cuenta)) return tareas;
  const salida: TareaFila[] = [];
  for (const tarea of tareas) {
    const abierta = !tareaCerrada(tarea) && !esContrato(tarea.contratoEscrow?.trim() ?? "");
    if (tarea.miembroId !== usuarioId || !abierta || esCuenta(tarea.walletCobro.trim())) {
      salida.push(tarea);
      continue;
    }
    try {
      await almacen.actualizarTarea(tarea.id, { walletCobro: cuenta });
      salida.push({ ...tarea, walletCobro: cuenta });
    } catch {
      console.warn(`[cobro] could not store the payout account for task ${tarea.id}`);
      salida.push(tarea);
    }
  }
  return salida;
}
