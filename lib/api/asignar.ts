import type { Almacen } from "@/lib/db/almacen";
import { avisarAsignacion } from "@/lib/tablon/publicar";
import { cambioDeMiembro } from "./cobro";
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
    await almacen.actualizarTarea(tarea.id, cambioDeMiembro(tarea, ""));
    await avisarAsignacion(almacen, tarea.id);
    return json({ tareaId: tarea.id, miembroId: "" });
  }
  const miembros = await almacen.listarMiembros(tarea.proyectoId);
  const miembro = miembros.find((item) => item.usuarioId === destino && item.estado === "active");
  if (!miembro) return json({ aviso: "That person is not in this event." }, 400);
  await almacen.actualizarTarea(tarea.id, cambioDeMiembro(tarea, destino));
  await avisarAsignacion(almacen, tarea.id);
  return json({ tareaId: tarea.id, miembroId: destino });
}

function miembroDe(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const id = (body as { usuarioId?: unknown }).usuarioId;
  if (typeof id !== "string") return null;
  return id.trim();
}
