import { conAlmacen } from "@/lib/api/base";
import { crearInvitacionHttp } from "@/lib/api/invitaciones";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => crearInvitacionHttp(request, almacen, id, sesion.usuarioId));
}
