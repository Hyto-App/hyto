import type { Almacen, CambioTarea } from "@/lib/db/almacen";
import { rechazoDeOrganizador, serializarRechazo } from "@/lib/revision/requisitos";
import { esOrganizador } from "./invitaciones";
import { json } from "./json";

export async function pedirOtraFotoHttp(
  almacen: Almacen,
  usuarioId: string,
  tareaId: string,
  pedido: unknown = null,
): Promise<Response> {
  const tarea = await almacen.leerTarea(tareaId);
  if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
  if (!(await esOrganizador(almacen, tarea.proyectoId, usuarioId))) {
    return json({ aviso: "Only the organizer reviews." }, 403);
  }
  if (tarea.estado === "pagado") return json({ aviso: "This task is already paid." }, 409);
  const cambio: CambioTarea = {};
  if (tarea.estado !== "pendiente") cambio.estado = "pendiente";
  if (await almacen.columnasRequisitos()) {
    cambio.rechazo = serializarRechazo(rechazoDeOrganizador(pedido, new Date().toISOString()));
  }
  if (Object.keys(cambio).length > 0) await almacen.actualizarTarea(tareaId, cambio);
  return json({ estado: "pendiente" });
}
