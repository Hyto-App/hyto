import { visorDe } from "@/lib/api/alcance";
import { conAlmacen } from "@/lib/api/base";
import { listarTareasHttp } from "@/lib/api/tareas";

export async function GET(request: Request): Promise<Response> {
  const visor = await visorDe(request);
  if (visor instanceof Response) return visor;
  return conAlmacen((almacen) => listarTareasHttp(almacen, visor));
}
