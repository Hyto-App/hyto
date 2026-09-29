import { respuestaSiExcedido } from "@/lib/escrow/limite";
import { leerEscrow, respuestaDeErrorFirma } from "@/lib/escrow/modulo";
import { exigirOrganizador } from "@/lib/sesion/exigir";

export async function GET(request: Request, contexto: { params: Promise<{ contrato: string }> }): Promise<Response> {
  const sesion = await exigirOrganizador(request);
  if (sesion) return sesion;
  const limitado = respuestaSiExcedido(request, "lectura");
  if (limitado) return limitado;
  const { contrato } = await contexto.params;
  try {
    const escrow = await leerEscrow(contrato.trim());
    return Response.json({ escrow });
  } catch (error) {
    return respuestaDeErrorFirma(error, "No se pudo leer el escrow.");
  }
}
