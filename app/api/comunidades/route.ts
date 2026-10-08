import { crearComunidadHttp, listarComunidadesHttp } from "@/lib/api/comunidades";
import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

function apagado(): Response | null {
  return comunidadesActivas() ? null : json({ aviso: "Not found." }, 404);
}

async function cuerpo(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
}

export async function GET(request: Request): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const consulta = new URL(request.url).searchParams.get("q") ?? "";
  return conAlmacen((almacen) => listarComunidadesHttp(almacen, sesion.usuarioId, consulta));
}

export async function POST(request: Request): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const body = await cuerpo(request);
  if (body instanceof Response) return body;
  return conAlmacen((almacen) => crearComunidadHttp(almacen, sesion.usuarioId, body));
}
