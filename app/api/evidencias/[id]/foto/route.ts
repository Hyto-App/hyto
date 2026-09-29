import { conAlmacen } from "@/lib/api/base";
import { leerFotoHttp } from "@/lib/api/evidencias";

export async function GET(_request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await contexto.params;
  return conAlmacen((almacen, fotos) => leerFotoHttp(almacen, fotos, id));
}
