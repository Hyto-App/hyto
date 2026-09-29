import { leerUsdcHttp, publicarUsdcHttp } from "@/lib/api/usdc";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function GET(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return leerUsdcHttp(sesion);
}

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  return publicarUsdcHttp(sesion, request);
}
