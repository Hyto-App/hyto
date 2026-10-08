import { conAlmacen } from "@/lib/api/base";
import { cuerpoJson, editarOrganizacionHttp, leerOrganizacionHttp, organizacionesApagadas } from "@/lib/api/organizaciones";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: Request, contexto: Contexto): Promise<Response> {
  const cerrado = organizacionesApagadas();
  if (cerrado) return cerrado;
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => leerOrganizacionHttp(almacen, sesion.usuarioId, id));
}

export async function PATCH(request: Request, contexto: Contexto): Promise<Response> {
  const cerrado = organizacionesApagadas();
  if (cerrado) return cerrado;
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const body = await cuerpoJson(request);
  if (body instanceof Response) return body;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => editarOrganizacionHttp(almacen, sesion.usuarioId, id, body));
}
