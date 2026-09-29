import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { AVISO_REVISION, estadoOrganizadorTarea, organizaAlguno } from "@/lib/api/organizador";
import { leerRevisionHttp } from "@/lib/api/revision";
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
    const estado = await estadoOrganizadorTarea(almacen, sesion.usuarioId, id);
    if (estado === "ausente") {
      if (await organizaAlguno(almacen, sesion.usuarioId)) {
        return json({ aviso: "No encontramos esa tarea." }, 404);
      }
      return json({ aviso: AVISO_REVISION }, 403);
    }
    if (estado === "no") return json({ aviso: AVISO_REVISION }, 403);
    return leerRevisionHttp(almacen, fotos, id, forzar, sesion.wallet);
  });
}
