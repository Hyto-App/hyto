import type { Almacen } from "@/lib/db/almacen";
import type { TareaFila } from "@/lib/db/tipos";

export const AVISO_ORGANIZADOR = "Only the organizer can lock the budget and pay.";
export const AVISO_REVISION = "Only the organizer reviews.";

export async function organizaAlguno(almacen: Almacen, usuarioId: string): Promise<boolean> {
  const miembros = await almacen.miembrosDeUsuario(usuarioId);
  return miembros.some((miembro) => miembro.rol === "organizer" && miembro.estado === "active");
}

export async function estadoOrganizadorTarea(
  almacen: Almacen,
  usuarioId: string,
  tareaId: string,
): Promise<"si" | "no" | "ausente"> {
  const tarea = await almacen.leerTarea(tareaId);
  if (!tarea) return "ausente";
  return (await esDe(almacen, usuarioId, tarea)) ? "si" : "no";
}

export async function respuestaSiNoOrganiza(
  almacen: Almacen | null,
  usuarioId: string,
  recurso: { tareaId?: string | null; contrato?: string | null },
  aviso = AVISO_ORGANIZADOR,
): Promise<Response | null> {
  if (!almacen) return Response.json({ aviso }, { status: 403 });
  const tareaId = recurso.tareaId?.trim() || null;
  const contrato = recurso.contrato?.trim() || null;
  if (contrato) {
    const tarea = (await almacen.listarTareas()).find((item) => item.contratoEscrow === contrato) ?? null;
    if (!tarea || (tareaId && tareaId !== tarea.id)) return Response.json({ aviso }, { status: 403 });
    if (!(await esDe(almacen, usuarioId, tarea))) return Response.json({ aviso }, { status: 403 });
    return null;
  }
  if (!tareaId) return Response.json({ aviso }, { status: 403 });
  const estado = await estadoOrganizadorTarea(almacen, usuarioId, tareaId);
  if (estado !== "si") return Response.json({ aviso }, { status: 403 });
  return null;
}

async function esDe(almacen: Almacen, usuarioId: string, tarea: TareaFila): Promise<boolean> {
  const miembros = await almacen.listarMiembros(tarea.proyectoId);
  return miembros.some((miembro) => miembro.usuarioId === usuarioId && miembro.rol === "organizer" && miembro.estado === "active");
}
