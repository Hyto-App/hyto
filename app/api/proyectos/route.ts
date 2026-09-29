import { visorDe } from "@/lib/api/alcance";
import { conAlmacen } from "@/lib/api/base";
import { crearProyectoHttp, leerProyectoHttp, rechazoProyectoDemo } from "@/lib/api/proyectos";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function GET(request: Request): Promise<Response> {
  const visor = await visorDe(request);
  if (visor instanceof Response) return visor;
  return conAlmacen((almacen) => leerProyectoHttp(almacen, visor));
}

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const demo = rechazoProyectoDemo(sesion);
  if (demo) return demo;
  return conAlmacen((almacen) => crearProyectoHttp(request, almacen, sesion.usuarioId));
}
