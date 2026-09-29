import { conAlmacen } from "@/lib/api/base";
import { crearProyectoHttp, leerProyectoHttp } from "@/lib/api/proyectos";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function GET(request?: Request): Promise<Response> {
  const usuarioId = request ? await usuarioSiHay(request) : null;
  return conAlmacen((almacen) => leerProyectoHttp(almacen, usuarioId));
}

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen) => crearProyectoHttp(request, almacen, sesion.usuarioId));
}

async function usuarioSiHay(request: Request): Promise<string | null> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return null;
  return sesion.usuarioId;
}
