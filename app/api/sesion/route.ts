import { conAlmacen } from "@/lib/api/base";
import { crearSesionHttp } from "@/lib/api/sesion";

export async function POST(request: Request): Promise<Response> {
  return conAlmacen((almacen) => crearSesionHttp(request, almacen));
}
