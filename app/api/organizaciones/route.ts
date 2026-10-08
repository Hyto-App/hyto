import { conAlmacen } from "@/lib/api/base";
import { crearOrganizacionHttp, cuerpoJson, listarOrganizacionesHttp, organizacionesApagadas } from "@/lib/api/organizaciones";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const cerrado = organizacionesApagadas();
  if (cerrado) return cerrado;
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen) => listarOrganizacionesHttp(almacen, sesion.usuarioId));
}

export async function POST(request: Request): Promise<Response> {
  const cerrado = organizacionesApagadas();
  if (cerrado) return cerrado;
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const body = await cuerpoJson(request);
  if (body instanceof Response) return body;
  return conAlmacen((almacen) => crearOrganizacionHttp(almacen, sesion.usuarioId, body));
}
