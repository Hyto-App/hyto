import { visorDe } from "@/lib/api/alcance";
import { conAlmacen } from "@/lib/api/base";
import { listarTareasHttp } from "@/lib/api/tareas";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const visor = await visorDe(request);
  if (visor instanceof Response) return visor;
  const alcance = new URL(request.url).searchParams.get("alcance") === "mias" ? "mias" : "evento";
  return conAlmacen((almacen) => listarTareasHttp(almacen, visor, alcance));
}
