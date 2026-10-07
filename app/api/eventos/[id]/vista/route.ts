import { visorDe } from "@/lib/api/alcance";
import { conAlmacen } from "@/lib/api/base";
import { vistaEventoHttp } from "@/lib/api/informe";

export const dynamic = "force-dynamic";

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const visor = await visorDe(request);
  if (visor instanceof Response) return visor;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => vistaEventoHttp(almacen, visor, id));
}
