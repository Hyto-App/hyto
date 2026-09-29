import { conAlmacen } from "@/lib/api/base";
import { leerEvidenciaHttp } from "@/lib/api/evidencias";

export async function GET(_request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await contexto.params;
  return conAlmacen((almacen) => leerEvidenciaHttp(almacen, id));
}
