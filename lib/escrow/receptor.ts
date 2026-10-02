import { cuentaTieneUsdc } from "@/lib/integrante/usdc";
import {
  AVISO_HORIZON_RECEPTOR,
  AVISO_RECEPTOR_NO_LISTO,
  CODIGO_HORIZON_RECEPTOR,
  CODIGO_RECEPTOR_NO_LISTO,
} from "./receptorAvisos";

const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";

export type EstadoReceptor =
  | { listo: true }
  | { listo: false; codigo: typeof CODIGO_RECEPTOR_NO_LISTO; aviso: typeof AVISO_RECEPTOR_NO_LISTO }
  | { listo: false; codigo: typeof CODIGO_HORIZON_RECEPTOR; aviso: typeof AVISO_HORIZON_RECEPTOR };

const NO_LISTO: EstadoReceptor = {
  listo: false,
  codigo: CODIGO_RECEPTOR_NO_LISTO,
  aviso: AVISO_RECEPTOR_NO_LISTO,
};

const RED: EstadoReceptor = {
  listo: false,
  codigo: CODIGO_HORIZON_RECEPTOR,
  aviso: AVISO_HORIZON_RECEPTOR,
};

export async function estadoReceptorUsdc(direccion: string, fetchImpl: typeof fetch = fetch): Promise<EstadoReceptor> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${HORIZON_TESTNET}/accounts/${encodeURIComponent(direccion)}`, {
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    return RED;
  }
  if (respuesta.status === 404) return NO_LISTO;
  if (!respuesta.ok) return RED;
  try {
    const json = (await respuesta.json()) as { balances?: { asset_code?: string; asset_issuer?: string }[] } | null;
    if (!json || typeof json !== "object") return RED;
    return cuentaTieneUsdc(json) ? { listo: true } : NO_LISTO;
  } catch {
    return RED;
  }
}

export function respuestaReceptor(estado: Exclude<EstadoReceptor, { listo: true }>): Response {
  const status = estado.codigo === CODIGO_RECEPTOR_NO_LISTO ? 409 : 503;
  return Response.json({ aviso: estado.aviso, codigo: estado.codigo }, { status });
}
