import type { SesionFila } from "@/lib/db/tipos";
import { leerEntrada } from "@/lib/escrow/cuerpos";
import { respuestaSiCuerpoGrande, respuestaSiExcedido, xdrDemasiadoLargo } from "@/lib/escrow/limite";
import { enviar, leerEscrow, preparar, respuestaDeErrorFirma } from "@/lib/escrow/modulo";
import { resolutoresDe } from "@/lib/escrow/resolver";
import { leerInvocacion } from "@/lib/escrow/xdr";
import { avisoSesionResolutor } from "@/lib/sesion/exigir";

export async function prepararFirmaHttp(sesion: SesionFila, request: Request): Promise<Response> {
  const grande = respuestaSiCuerpoGrande(request);
  if (grande) return grande;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ aviso: "El cuerpo no es JSON." }, { status: 400 });
  }
  const entrada = leerEntrada(body);
  if ("aviso" in entrada) return Response.json({ aviso: entrada.aviso }, { status: 400 });
  if (entrada.accion === "resolver") {
    const aviso = avisoSesionResolutor(sesion, entrada.firmante);
    if (aviso) return Response.json({ aviso }, { status: 400 });
  } else if (sesion.rol !== "organizador") {
    return Response.json({ aviso: "Solo el organizador prepara el pago." }, { status: 403 });
  }
  const limitado = respuestaSiExcedido(request);
  if (limitado) return limitado;
  try {
    const listo = await preparar(entrada);
    return Response.json({ xdr: listo.xdr, hashPreparado: listo.hashPreparado, contrato: listo.contrato });
  } catch (error) {
    return respuestaDeErrorFirma(error, "No se pudo preparar el pago.");
  }
}

export async function enviarFirmaHttp(sesion: SesionFila, request: Request): Promise<Response> {
  const limitado = respuestaSiExcedido(request) ?? respuestaSiCuerpoGrande(request);
  if (limitado) return limitado;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ aviso: "El cuerpo no es JSON." }, { status: 400 });
  }
  const envio = datosEnvio(body);
  if (!envio.xdr) return Response.json({ aviso: "Falta el XDR firmado." }, { status: 400 });
  if (xdrDemasiadoLargo(envio.xdr)) return Response.json({ aviso: "El XDR firmado es demasiado largo." }, { status: 400 });
  // accion y firmante del cuerpo no autorizan el envío. La cuenta sale del XDR.
  const invocacion = leerInvocacion(envio.xdr);
  const wallet = (sesion.wallet ?? "").trim();
  if (!invocacion || invocacion.firmantes.length !== 1 || invocacion.firmantes[0] !== wallet) {
    return Response.json({ aviso: "El XDR no lo firma la wallet de esta sesión." }, { status: 400 });
  }
  if (invocacion.funcion === "resolve_dispute") {
    try {
      const escrow = await leerEscrow(invocacion.contrato);
      if (!resolutoresDe([escrow]).includes(wallet)) {
        return Response.json(
          {
            aviso: "Solo el resolutor de la disputa puede firmar esta resolución.",
            codigo: "ESCROW_ONLY_DISPUTE_RESOLVER_CAN_EXECUTE",
          },
          { status: 403 },
        );
      }
    } catch (error) {
      return respuestaDeErrorFirma(error, "No se pudo leer el escrow.");
    }
  } else if (sesion.rol !== "organizador") {
    return Response.json({ aviso: "Solo el organizador prepara el pago." }, { status: 403 });
  }
  try {
    const pago = await enviar(envio.xdr);
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

function datosEnvio(body: unknown): { xdr: string | null } {
  if (!body || typeof body !== "object") return { xdr: null };
  const datos = body as { xdr?: unknown };
  const xdr = typeof datos.xdr === "string" ? datos.xdr.trim() : "";
  return { xdr: xdr || null };
}
