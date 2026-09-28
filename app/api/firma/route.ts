import { leerEntrada } from "@/lib/escrow/cuerpos";
import { ErrorFirma, preparar } from "@/lib/escrow/modulo";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ aviso: "El cuerpo no es JSON." }, { status: 400 });
  }
  const entrada = leerEntrada(body);
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
