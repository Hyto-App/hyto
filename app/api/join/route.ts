import { conAlmacen } from "@/lib/api/base";
import { canjearInvitacionHttp } from "@/lib/api/invitaciones";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen) => canjearInvitacionHttp(request, almacen, sesion.usuarioId, sesion.email));
}
