import { conAlmacen } from "@/lib/api/base";
import { novedadesHttp } from "@/lib/api/novedades";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => novedadesHttp(almacen, sesion, id, request));
}
