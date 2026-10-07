import { conAlmacen } from "@/lib/api/base";
import { cerrarSesionHttp, crearSesionHttp, leerSesionHttp } from "@/lib/api/sesion";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return conAlmacen((almacen) => leerSesionHttp(request, almacen));
}

export async function POST(request: Request): Promise<Response> {
  return conAlmacen((almacen) => crearSesionHttp(request, almacen));
}

export async function DELETE(request: Request): Promise<Response> {
  return conAlmacen((almacen) => cerrarSesionHttp(request, almacen));
}
