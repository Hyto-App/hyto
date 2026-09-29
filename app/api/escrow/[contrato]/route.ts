import { conAlmacen } from "@/lib/api/base";
import { AVISO_ORGANIZADOR, respuestaSiNoOrganiza } from "@/lib/api/organizador";
import { respuestaSiExcedido } from "@/lib/escrow/limite";
import { leerEscrow, respuestaDeLectura } from "@/lib/escrow/modulo";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function GET(request: Request, contexto: { params: Promise<{ contrato: string }> }): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const limitado = respuestaSiExcedido(request, "lectura");
  if (limitado) return limitado;
  const { contrato } = await contexto.params;
  const id = contrato.trim();
  return conAlmacen(async (almacen) => {
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
