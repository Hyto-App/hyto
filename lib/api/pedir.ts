import type { Almacen } from "@/lib/db/almacen";
import { esOrganizador } from "./invitaciones";
import { json } from "./json";

export async function pedirOtraFotoHttp(almacen: Almacen, usuarioId: string, tareaId: string): Promise<Response> {
  const tarea = await almacen.leerTarea(tareaId);
  if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
  if (!(await esOrganizador(almacen, tarea.proyectoId, usuarioId))) {
    return json({ aviso: "Only the organizer reviews." }, 403);
  }
  if (tarea.estado === "pagado") return json({ aviso: "This task is already paid." }, 409);
  if (tarea.estado !== "pendiente") await almacen.actualizarTarea(tareaId, { estado: "pendiente" });
  return json({ estado: "pendiente" });
}
