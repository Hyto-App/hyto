import { vincularEventoHttp } from "@/lib/api/comunidades";
import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

async function cuerpo(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
}

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!comunidadesActivas()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const body = await cuerpo(request);
  if (body instanceof Response) return body;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => vincularEventoHttp(almacen, sesion.usuarioId, id, body, false));
}

export async function DELETE(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!comunidadesActivas()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const body = await cuerpo(request);
  if (body instanceof Response) return body;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => vincularEventoHttp(almacen, sesion.usuarioId, id, body, true));
}
