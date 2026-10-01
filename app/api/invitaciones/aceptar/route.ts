import { aceptarInvitacionHttp } from "@/lib/api/invitaciones";
import { conAlmacen } from "@/lib/api/base";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen) => aceptarInvitacionHttp(request, almacen, sesion));
}
