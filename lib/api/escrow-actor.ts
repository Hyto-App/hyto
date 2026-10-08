import type { Almacen } from "@/lib/db/almacen";
import type { SesionFila, TareaFila } from "@/lib/db/tipos";
import { esContrato, esCuenta } from "@/lib/escrow/cuerpos";
import { leerEscrow } from "@/lib/escrow/modulo";
import {
  AVISO_MARCA_DESCONOCIDA,
  AVISO_MARCA_PENDIENTE,
  AVISO_PAGO_PARCIAL,
  AVISO_SOLO_TRABAJADOR,
  hitoMarcadoDe,
  puedeLiberarDirecto,
} from "@/lib/escrow/reserva";

export async function tareaDeFirma(
  almacen: Almacen,
  recurso: { tareaId?: string | null; contrato?: string | null },
): Promise<TareaFila | null> {
  const tareaId = recurso.tareaId?.trim() || null;
  const contrato = recurso.contrato?.trim() || null;
  if (tareaId) {
    const porId = await almacen.leerTarea(tareaId);
    if (!porId) return null;
    if (contrato && porId.contratoEscrow !== contrato) return null;
    return porId;
  }
  if (!contrato) return null;
  return (await almacen.listarTareas()).find((item) => item.contratoEscrow === contrato) ?? null;
}

export async function walletTrabajador(
  almacen: Almacen | null,
  sesion: SesionFila,
  recurso: { tareaId?: string | null; contrato?: string | null },
): Promise<string | Response> {
  if (!almacen) return Response.json({ aviso: AVISO_SOLO_TRABAJADOR }, { status: 403 });
  const wallet = sesion.wallet.trim();
  if (!esCuenta(wallet)) {
    return Response.json({ aviso: "This session has no Stellar wallet. Sign in again to sign." }, { status: 400 });
  }
  const tarea = await tareaDeFirma(almacen, recurso);
  if (!tarea || tarea.miembroId !== sesion.usuarioId || tarea.walletCobro !== wallet) {
    return Response.json({ aviso: AVISO_SOLO_TRABAJADOR }, { status: 403 });
  }
  return wallet;
}

export async function avisoMarcaPendiente(contrato: string): Promise<Response | null> {
  if (!esContrato(contrato)) return Response.json({ aviso: AVISO_MARCA_PENDIENTE }, { status: 409 });
  try {
    const escrow = await leerEscrow(contrato);
    if (!hitoMarcadoDe(escrow)) return Response.json({ aviso: AVISO_MARCA_PENDIENTE }, { status: 409 });
    return null;
  } catch {
    return Response.json({ aviso: AVISO_MARCA_DESCONOCIDA }, { status: 409 });
  }
}

export async function avisoPagoParcial(almacen: Almacen, recurso: { tareaId?: string | null; contrato?: string | null }): Promise<Response | null> {
  const tarea = await tareaDeFirma(almacen, recurso);
  if (!tarea) return null;
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  const listo = puedeLiberarDirecto({ ...tarea, montoConfirmado: evidencia?.montoConfirmado ?? null }, true);
  if (listo) return null;
  return Response.json({ aviso: AVISO_PAGO_PARCIAL }, { status: 409 });
}
