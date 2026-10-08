import { tomarTareaHttp } from "@/lib/api/tablon";
import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { comunidadesActivas } from "@/lib/comunidades/bandera";
import { exigirSesion } from "@/lib/sesion/exigir";
import { tablonActivo } from "@/lib/tablon/bandera";

export const dynamic = "force-dynamic";

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!tablonActivo() || !comunidadesActivas()) return json({ aviso: "Not found." }, 404);
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => tomarTareaHttp(almacen, sesion.usuarioId, id));
}
