import { respuestaSiCuerpoGrande, respuestaSiExcedido, xdrDemasiadoLargo } from "@/lib/escrow/limite";
import { enviar, respuestaDeErrorFirma } from "@/lib/escrow/modulo";
import { exigirSesion } from "@/lib/sesion/exigir";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const limitado = respuestaSiExcedido(request) ?? respuestaSiCuerpoGrande(request);
  if (limitado) return limitado;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ aviso: "El cuerpo no es JSON." }, { status: 400 });
  }
  const xdr = xdrDe(body);
  if (!xdr) return Response.json({ aviso: "Falta el XDR firmado." }, { status: 400 });
  if (xdrDemasiadoLargo(xdr)) return Response.json({ aviso: "El XDR firmado es demasiado largo." }, { status: 400 });
  try {
    const pago = await enviar(xdr);
    return Response.json({
      hash: pago.hash,
      ledger: pago.ledger,
      codigo: pago.codigo,
      contrato: pago.contrato,
      estado: pago.estado,
    });
  } catch (error) {
    return respuestaDeErrorFirma(error, "No se pudo enviar el pago.");
  }
}

function xdrDe(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const xdr = (body as { xdr?: unknown }).xdr;
  if (typeof xdr !== "string") return null;
  const limpio = xdr.trim();
  return limpio ? limpio : null;
}
