import type { Almacen } from "@/lib/db/almacen";
import { esOrganizador } from "./invitaciones";
import { json } from "./json";

export async function asignarTareaHttp(request: Request, almacen: Almacen, tareaId: string, usuarioId: string): Promise<Response> {
  const tarea = await almacen.leerTarea(tareaId);
  if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
  if (!(await esOrganizador(almacen, tarea.proyectoId, usuarioId))) {
    return json({ aviso: "Only the organizer can assign tasks." }, 403);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const destino = miembroDe(body);
  if (!destino) return json({ aviso: "Choose a person in this event." }, 400);
  const miembros = await almacen.listarMiembros(tarea.proyectoId);
  const miembro = miembros.find((item) => item.usuarioId === destino && item.estado === "active");
  if (!miembro) return json({ aviso: "That person is not in this event." }, 400);
  await almacen.actualizarTarea(tarea.id, { miembroId: destino });
  return json({ tareaId: tarea.id, miembroId: destino });
}

function miembroDe(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const id = (body as { usuarioId?: unknown }).usuarioId;
  return typeof id === "string" ? id.trim() : "";
}
