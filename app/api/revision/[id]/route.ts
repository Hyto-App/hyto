import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { leerRevisionHttp } from "@/lib/api/revision";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  return atender(request, contexto, false);
}

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  return atender(request, contexto, true);
}

async function atender(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
  forzar: boolean,
): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  if (sesion.rol !== "organizador") return json({ aviso: "Solo el organizador revisa." }, 403);
  const { id } = await contexto.params;
  return conAlmacen((almacen, fotos) => leerRevisionHttp(almacen, fotos, id, forzar, sesion.wallet));
}
