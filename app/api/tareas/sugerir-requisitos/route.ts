import { sugerirRequisitosHttp } from "@/lib/api/sugerir-requisitos";
import { json } from "@/lib/api/json";
import { exigirSesion } from "@/lib/sesion/exigir";
import { sesionEsDemo } from "@/lib/sesion/demo";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  if (sesionEsDemo(sesion)) return json({ aviso: "Demo mode cannot suggest requirements." }, 403);
  return sugerirRequisitosHttp(request, undefined, sesion.usuarioId);
}
