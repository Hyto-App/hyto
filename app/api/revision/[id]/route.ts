import { conAlmacen } from "@/lib/api/base";

export const maxDuration = 30;
import { json } from "@/lib/api/json";
import { AVISO_REVISION, estadoOrganizadorTarea, organizaAlguno } from "@/lib/api/organizador";
import { leerRevisionHttp } from "@/lib/api/revision";
import { esProyectoDemo } from "@/lib/db/semilla";
import { demoHabilitado, sesionEsDemo } from "@/lib/sesion/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  return atender(request, contexto, false);
}

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  return atender(request, contexto, true);
}

async function atender(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
  forzar: boolean,
): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  return conAlmacen(async (almacen, fotos) => {
    if (demoHabilitado() && sesionEsDemo(sesion)) {
      const tarea = await almacen.leerTarea(id);
      const proyecto = tarea ? await almacen.leerProyecto(tarea.proyectoId) : null;
      if (!esProyectoDemo(proyecto)) return json({ aviso: AVISO_REVISION }, 403);
    }
    const estado = await estadoOrganizadorTarea(almacen, sesion.usuarioId, id);
    if (estado === "ausente") {
      if (await organizaAlguno(almacen, sesion.usuarioId)) {
        return json({ aviso: "We couldn't find that task." }, 404);
      }
      return json({ aviso: AVISO_REVISION }, 403);
    }
    if (estado === "no") return json({ aviso: AVISO_REVISION }, 403);
    return leerRevisionHttp(almacen, fotos, id, forzar, sesion.wallet);
  });
}
