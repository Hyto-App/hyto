import { conAlmacen } from "@/lib/api/base";
import { json } from "@/lib/api/json";
import { AVISO_ORGANIZADOR, respuestaSiNoOrganiza } from "@/lib/api/organizador";
import { esProyectoDemo } from "@/lib/db/semilla";
import { respuestaSiExcedido } from "@/lib/escrow/limite";
import { leerEscrow, respuestaDeLectura } from "@/lib/escrow/modulo";
import { demoHabilitado, sesionEsDemo } from "@/lib/sesion/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function GET(request: Request, contexto: { params: Promise<{ contrato: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const limitado = respuestaSiExcedido(request, "lectura");
  if (limitado) return limitado;
  const { contrato } = await contexto.params;
  const id = contrato.trim();
  return conAlmacen(async (almacen) => {
    if (demoHabilitado() && sesionEsDemo(sesion)) {
      const tarea = (await almacen.listarTareas()).find((item) => item.contratoEscrow === id) ?? null;
      const proyecto = tarea ? await almacen.leerProyecto(tarea.proyectoId) : null;
      if (!esProyectoDemo(proyecto)) return json({ aviso: AVISO_ORGANIZADOR }, 403);
    }
    const rechazo = await respuestaSiNoOrganiza(almacen, sesion.usuarioId, { contrato: id }, AVISO_ORGANIZADOR);
    if (rechazo) return rechazo;
    try {
      const escrow = await leerEscrow(id);
      return Response.json({ escrow });
    } catch (error) {
      return respuestaDeLectura(error);
    }
  });
}
