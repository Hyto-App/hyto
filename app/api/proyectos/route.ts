import { conAlmacen } from "@/lib/api/base";
import { crearProyectoHttp, leerProyectoHttp } from "@/lib/api/proyectos";

export async function GET(): Promise<Response> {
  return conAlmacen((almacen) => leerProyectoHttp(almacen));
}

export async function POST(request: Request): Promise<Response> {
  return conAlmacen((almacen) => crearProyectoHttp(request, almacen));
}
