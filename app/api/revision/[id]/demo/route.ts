import { conAlmacen } from "@/lib/api/base";
import { accionDemoDe, accionDemoHttp } from "@/lib/api/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  const body = (await request.json().catch(() => null)) as { accion?: unknown } | null;
  return conAlmacen((almacen) => accionDemoHttp(almacen, sesion, id, accionDemoDe(body?.accion)));
}
