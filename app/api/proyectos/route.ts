import { conAlmacen } from "@/lib/api/base";
import { crearProyectoHttp, leerProyectoHttp } from "@/lib/api/proyectos";
import { exigirOrganizador } from "@/lib/sesion/exigir";

export async function GET(): Promise<Response> {
  return conAlmacen((almacen) => leerProyectoHttp(almacen));
}

export async function POST(request: Request): Promise<Response> {
  const rechazo = await exigirOrganizador(request, "Solo el organizador crea el proyecto.");
  if (rechazo) return rechazo;
  return conAlmacen((almacen) => crearProyectoHttp(request, almacen));
}
