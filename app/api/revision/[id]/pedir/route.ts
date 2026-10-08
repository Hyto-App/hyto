import { conAlmacen } from "@/lib/api/base";
import { pedirOtraFotoHttp } from "@/lib/api/pedir";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  const pedido = await cuerpoJson(request);
  return conAlmacen((almacen) => pedirOtraFotoHttp(almacen, sesion.usuarioId, id, pedido));
}

async function cuerpoJson(request: Request): Promise<unknown> {
  const tipo = request.headers.get("content-type") ?? "";
  if (!tipo.includes("application/json")) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}
