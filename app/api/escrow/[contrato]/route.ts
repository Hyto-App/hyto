import { respuestaSiExcedido } from "@/lib/escrow/limite";
import { ErrorFirma, leerEscrow } from "@/lib/escrow/modulo";
import { exigirOrganizador } from "@/lib/sesion/exigir";

export async function GET(request: Request, contexto: { params: Promise<{ contrato: string }> }): Promise<Response> {
  const sesion = await exigirOrganizador(request);
  if (sesion) return sesion;
  const limitado = respuestaSiExcedido(request);
  if (limitado) return limitado;
  const { contrato } = await contexto.params;
  try {
    const escrow = await leerEscrow(contrato.trim());
    return Response.json({ escrow });
  } catch (error) {
    return responderError(error);
  }
}

function responderError(error: unknown): Response {
  if (error instanceof ErrorFirma) {
    const estado = error.estado >= 400 && error.estado <= 599 ? error.estado : 502;
    return Response.json({ aviso: error.message, codigo: error.codigo }, { status: estado });
  }
  return Response.json({ aviso: "No se pudo leer el escrow." }, { status: 502 });
}
