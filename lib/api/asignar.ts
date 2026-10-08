import type { Almacen } from "@/lib/db/almacen";
import type { TareaFila } from "@/lib/db/tipos";
import { escrowV2Activo } from "@/lib/escrow/bandera";
import { esContrato, esCuenta } from "@/lib/escrow/cuerpos";
import { montoAReservar, planReserva } from "@/lib/escrow/reserva";
import { avisarAsignacion } from "@/lib/tablon/publicar";
import { avisoBloqueo } from "./editar-tarea";
import { esOrganizador } from "./invitaciones";
import { json } from "./json";

export async function asignarTareaHttp(request: Request, almacen: Almacen, tareaId: string, usuarioId: string): Promise<Response> {
  const tarea = await almacen.leerTarea(tareaId);
  if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
  if (!(await esOrganizador(almacen, tarea.proyectoId, usuarioId))) {
    return json({ aviso: "Only the organizer can assign tasks." }, 403);
  }
  const bloqueo = avisoBloqueo(tarea, Boolean(await almacen.ultimaEvidencia(tarea.id)));
  if (bloqueo) return json({ aviso: bloqueo }, 409);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const destino = miembroDe(body);
  if (destino === null) return json({ aviso: "Choose a person in this event." }, 400);
  if (destino === "") {
    await almacen.actualizarTarea(tarea.id, { miembroId: "" });
    await avisarAsignacion(almacen, tarea.id);
    return json({ tareaId: tarea.id, miembroId: "" });
  }
  const miembros = await almacen.listarMiembros(tarea.proyectoId);
  const miembro = miembros.find((item) => item.usuarioId === destino && item.estado === "active");
  if (!miembro) return json({ aviso: "That person is not in this event." }, 400);
  await almacen.actualizarTarea(tarea.id, { miembroId: destino });
  await avisarAsignacion(almacen, tarea.id);
  if (!escrowV2Activo()) return json({ tareaId: tarea.id, miembroId: destino });
  const actual = (await almacen.leerTarea(tarea.id)) ?? { ...tarea, miembroId: destino };
  const wallet = await almacen.walletDeUsuario(destino);
  let cobro = actual.walletCobro;
  if (wallet && esCuenta(wallet) && !esContrato(actual.contratoEscrow ?? "") && cobro !== wallet) {
    await almacen.actualizarTarea(tarea.id, { walletCobro: wallet });
    cobro = wallet;
  }
  const monto = montoAReservar(actual);
  const plan = planReserva({
    proteger: true,
    walletCobro: cobro,
    contrato: actual.contratoEscrow,
    estado: actual.estado,
    monto,
  });
  return json({
    tareaId: tarea.id,
    miembroId: destino,
    escrowV2: true,
    reservar: plan.reservar,
    motivo: plan.motivo,
    monto,
    walletCobro: cobro,
  });
}

export async function sincronizarCobroParaReserva(almacen: Almacen, tareas: TareaFila[]): Promise<void> {
  if (!escrowV2Activo()) return;
  for (const tarea of tareas) {
    if (!tarea.miembroId || esContrato(tarea.contratoEscrow ?? "") || esCuenta(tarea.walletCobro)) continue;
    const wallet = await almacen.walletDeUsuario(tarea.miembroId);
    if (!wallet || !esCuenta(wallet)) continue;
    await almacen.actualizarTarea(tarea.id, { walletCobro: wallet });
    tarea.walletCobro = wallet;
  }
}

function miembroDe(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const id = (body as { usuarioId?: unknown }).usuarioId;
  if (typeof id !== "string") return null;
  return id.trim();
}
