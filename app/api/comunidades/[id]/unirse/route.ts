import { unirseComunidadHttp } from "@/lib/api/comunidades";
import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { exigirSesion } from "@/lib/sesion/exigir";

export const dynamic = "force-dynamic";

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!comunidadesActivas()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => unirseComunidadHttp(almacen, sesion.usuarioId, id));
}
