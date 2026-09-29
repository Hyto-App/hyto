import { conAlmacen } from "@/lib/api/base";
import { cerrarSesionHttp, crearSesionHttp } from "@/lib/api/sesion";

export async function POST(request: Request): Promise<Response> {
  return conAlmacen((almacen) => crearSesionHttp(request, almacen));
}

export async function DELETE(request: Request): Promise<Response> {
  return conAlmacen((almacen) => cerrarSesionHttp(request, almacen));
}
