import { prepararFirmaHttp } from "@/lib/api/firma";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return prepararFirmaHttp(sesion, request);
}
