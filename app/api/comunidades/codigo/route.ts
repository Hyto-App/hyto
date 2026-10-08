import { unirsePorCodigoHttp } from "@/lib/api/comunidades";
import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!comunidadesActivas()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  return conAlmacen((almacen) => unirsePorCodigoHttp(almacen, sesion.usuarioId, body));
}
