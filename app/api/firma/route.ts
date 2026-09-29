import { prepararFirmaHttp } from "@/lib/api/firma";
import type { SesionFila } from "@/lib/db/tipos";
import { rechazarFirmaDemo } from "@/lib/sesion/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request): Promise<Response> {
  return atenderPreparar(request, await exigirSesion(request));
}

export async function atenderPreparar(request: Request, sesion: SesionFila | Response): Promise<Response> {
  if (sesion instanceof Response) return sesion;
  const demo = rechazarFirmaDemo(sesion);
  if (demo) return demo;
  return prepararFirmaHttp(sesion, request);
}
