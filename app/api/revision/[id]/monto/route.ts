import { conAlmacen } from "@/lib/api/base";
import { confirmarMontoHttp } from "@/lib/api/confirmar-monto";
import { json } from "@/lib/api/json";
import { AVISO_REVISION, estadoOrganizadorTarea, organizaAlguno } from "@/lib/api/organizador";
import { demoHabilitado, sesionEsDemo } from "@/lib/sesion/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  if (demoHabilitado() && sesionEsDemo(sesion)) return json({ aviso: "Demo mode cannot confirm an amount." }, 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const { id } = await contexto.params;
  return conAlmacen(async (almacen) => {
    const estado = await estadoOrganizadorTarea(almacen, sesion.usuarioId, id);
    if (estado === "ausente") {
      if (await organizaAlguno(almacen, sesion.usuarioId)) return json({ aviso: "We couldn't find that task." }, 404);
      return json({ aviso: AVISO_REVISION }, 403);
    }
    if (estado === "no") return json({ aviso: AVISO_REVISION }, 403);
    return confirmarMontoHttp(almacen, id, body);
  });
}
