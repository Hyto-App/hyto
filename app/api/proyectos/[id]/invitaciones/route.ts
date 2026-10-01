import { crearInvitacionHttp } from "@/lib/api/invitaciones";
import { conAlmacen } from "@/lib/api/base";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => crearInvitacionHttp(request, almacen, sesion, id));
}
