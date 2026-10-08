import { conAlmacen } from "@/lib/api/base";
import { contactosDeEventoHttp, organizacionesApagadas } from "@/lib/api/organizaciones";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const cerrado = organizacionesApagadas();
  if (cerrado) return cerrado;
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => contactosDeEventoHttp(almacen, sesion.usuarioId, id));
}
