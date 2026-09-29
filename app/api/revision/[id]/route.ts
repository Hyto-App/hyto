import { conAlmacen } from "@/lib/api/base";
import { leerRevisionHttp } from "@/lib/api/revision";

export async function GET(_request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await contexto.params;
  return conAlmacen((almacen, fotos) => leerRevisionHttp(almacen, fotos, id));
}

export async function POST(_request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await contexto.params;
  return conAlmacen((almacen, fotos) => leerRevisionHttp(almacen, fotos, id, true));
}
