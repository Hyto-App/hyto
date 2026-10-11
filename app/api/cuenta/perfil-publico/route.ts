import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { guardarAjustesPerfilHttp, leerAjustesPerfilHttp } from "@/lib/api/perfil-publico";
import { perfilPublicoActivo } from "@/lib/perfil/bandera";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (!perfilPublicoActivo()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return conAlmacen((almacen) => leerAjustesPerfilHttp(almacen, sesion.usuarioId));
}

export async function POST(request: Request): Promise<Response> {
  if (!perfilPublicoActivo()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  return conAlmacen((almacen) => guardarAjustesPerfilHttp(almacen, sesion.usuarioId, body));
}
