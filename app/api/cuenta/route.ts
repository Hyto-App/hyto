import { conAlmacen } from "@/lib/api/base";
import { leerCuentaHttp } from "@/lib/api/cuenta";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function GET(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen) => leerCuentaHttp(sesion, almacen));
}
