import { leerEntrada } from "@/lib/escrow/cuerpos";
import { leerJsonAcotado, respuestaSiExcedido } from "@/lib/escrow/limite";
import { ErrorFirma, preparar } from "@/lib/escrow/modulo";
import { exigirOrganizador } from "@/lib/sesion/exigir";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirOrganizador(request);
  if (sesion) return sesion;
  const limitado = respuestaSiExcedido(request);
  if (limitado) return limitado;
  const cuerpo = await leerJsonAcotado(request);
  if (cuerpo instanceof Response) return cuerpo;
  const entrada = leerEntrada(cuerpo.json);
  if ("aviso" in entrada) return Response.json({ aviso: entrada.aviso }, { status: 400 });
  if (entrada.accion === "liberar") {
    return Response.json({ aviso: "En v2 aprobar ya libera el hito." }, { status: 400 });
  }
  try {
    const listo = await preparar(entrada);
    return Response.json({ xdr: listo.xdr, hashPreparado: listo.hashPreparado, contrato: listo.contrato });
  } catch (error) {
    return responderError(error);
  }
}

function responderError(error: unknown): Response {
  if (error instanceof ErrorFirma) {
    const estado = error.estado >= 400 && error.estado <= 599 ? error.estado : 502;
    return Response.json({ aviso: error.message, codigo: error.codigo }, { status: estado });
  }
  return Response.json({ aviso: "No se pudo preparar el pago." }, { status: 502 });
}
