import { guardarTipoCuentaHttp, leerTipoCuentaHttp } from "@/lib/api/tipo-cuenta";
import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!tipoCuentaActivo()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen) => leerTipoCuentaHttp(almacen, sesion.usuarioId));
}

export async function POST(request: Request): Promise<Response> {
  if (!tipoCuentaActivo()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  return conAlmacen((almacen) => guardarTipoCuentaHttp(almacen, sesion.usuarioId, body));
}
