import type { SesionFila } from "@/lib/db/tipos";
import { leerEntrada } from "@/lib/escrow/cuerpos";
import { respuestaSiCuerpoGrande, respuestaSiExcedido, xdrDemasiadoLargo } from "@/lib/escrow/limite";
import { enviar, preparar, respuestaDeErrorFirma } from "@/lib/escrow/modulo";
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
  // Una resolución tiene que declarar firmante. Si no es la wallet de la sesión, no se manda.
  if (envio.accion === "resolver") {
    const aviso = avisoSesionResolutor(sesion, envio.firmante);
    if (aviso) return Response.json({ aviso }, { status: 400 });
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

function datosEnvio(body: unknown): { xdr: string | null; accion: string | null; firmante: string } {
  if (!body || typeof body !== "object") return { xdr: null, accion: null, firmante: "" };
  const datos = body as { xdr?: unknown; accion?: unknown; firmante?: unknown };
  const xdr = typeof datos.xdr === "string" ? datos.xdr.trim() : "";
  const accion = typeof datos.accion === "string" ? datos.accion : null;
  const firmante = typeof datos.firmante === "string" ? datos.firmante.trim() : "";
  return { xdr: xdr || null, accion, firmante };
}
