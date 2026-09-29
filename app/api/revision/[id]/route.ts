import { conAlmacen } from "@/lib/api/base";
import { leerRevisionHttp } from "@/lib/api/revision";
import { exigirOrganizador } from "@/lib/sesion/exigir";

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const rechazo = await exigirOrganizador(request, "Solo el organizador revisa.");
  if (rechazo) return rechazo;
  const { id } = await contexto.params;
  return conAlmacen((almacen, fotos) => leerRevisionHttp(almacen, fotos, id));
}

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const rechazo = await exigirOrganizador(request, "Solo el organizador revisa.");
  if (rechazo) return rechazo;
  const { id } = await contexto.params;
  return conAlmacen((almacen, fotos) => leerRevisionHttp(almacen, fotos, id, true));
}
