import { visorDe } from "@/lib/api/alcance";
import { conAlmacen } from "@/lib/api/base";
import { guardarPortadaHttp, leerPortadaHttp } from "@/lib/api/contexto-evento";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const visor = await visorDe(request);
  if (visor instanceof Response) return visor;
  const { id } = await contexto.params;
  return conAlmacen((almacen, fotos) => leerPortadaHttp(almacen, fotos, id, visor));
}

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  return conAlmacen((almacen, fotos) => guardarPortadaHttp(request, almacen, fotos, id, sesion.usuarioId));
}
