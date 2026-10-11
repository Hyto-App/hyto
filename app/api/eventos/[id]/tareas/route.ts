import { conAlmacen } from "@/lib/api/base";
import { agregarTareaHttp, rechazoProyectoDemo } from "@/lib/api/proyectos";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const demo = rechazoProyectoDemo(sesion);
  if (demo) return demo;
  const { id } = await contexto.params;
  return conAlmacen((almacen) => agregarTareaHttp(request, almacen, id, sesion.usuarioId, { wallet: sesion.wallet }));
}
