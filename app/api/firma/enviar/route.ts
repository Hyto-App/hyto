import { respuestaSiCuerpoGrande, respuestaSiExcedido, xdrDemasiadoLargo } from "@/lib/escrow/limite";
import { ErrorFirma, enviar } from "@/lib/escrow/modulo";
import { exigirOrganizador } from "@/lib/sesion/exigir";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirOrganizador(request);
  if (sesion) return sesion;
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
    if (error instanceof ErrorFirma) {
      const estado = error.estado >= 400 && error.estado <= 599 ? error.estado : 502;
      return Response.json({ aviso: error.message, codigo: error.codigo }, { status: estado });
    }
    return Response.json({ aviso: "No se pudo enviar el pago." }, { status: 502 });
  }
}

function xdrDe(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const xdr = (body as { xdr?: unknown }).xdr;
  if (typeof xdr !== "string") return null;
  const limpio = xdr.trim();
  return limpio ? limpio : null;
}
