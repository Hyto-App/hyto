import { guardarPerfilHttp, leerPerfilHttp } from "@/lib/api/perfil";
import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { perfilVoluntarioActivo } from "@/lib/perfil/bandera";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!perfilVoluntarioActivo()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen) => leerPerfilHttp(almacen, sesion.usuarioId));
}

export async function POST(request: Request): Promise<Response> {
  if (!perfilVoluntarioActivo()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  return conAlmacen((almacen) => guardarPerfilHttp(almacen, sesion.usuarioId, body));
}
