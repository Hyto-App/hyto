import type { BilleteraCobro } from "./tipos";
import { asegurarCobroUsdc, consultarUsdc } from "./usdc";

export type AltaTestnet =
  | { ok: true; friendbot: boolean; trustline: boolean }
  | { ok: false; aviso: string };

const AVISO_ALTA = "We couldn't finish Stellar testnet setup.";

/**
 * Sign up only. Funds a missing testnet account with Friendbot, then opens USDC.
 * Sign in must not call this.
 */
export async function completarAltaTestnet(
  billetera: BilleteraCobro,
  opciones: { fetch?: typeof fetch } = {},
): Promise<AltaTestnet> {
  const fetchImpl = opciones.fetch ?? fetch;
  let respuesta: Response;
  try {
    respuesta = await fetchImpl("/api/sesion/alta", { method: "POST" });
  } catch {
    return { ok: false, aviso: AVISO_ALTA };
  }
  const cuerpo = await leer(respuesta);
  if (!respuesta.ok) return { ok: false, aviso: avisoDe(cuerpo) };
  const friendbot = cuerpo.friendbot === true;
  const yaUsdc = cuerpo.usdc === true;
  if (yaUsdc && billetera.status !== "undeployed") return { ok: true, friendbot, trustline: false };
  try {
    const lista = await asegurarCobroUsdc(billetera, (direccion) => consultarUsdc(direccion, fetchImpl));
    if (!lista.usdcListo) {
      return { ok: false, aviso: lista.detalle ?? "We couldn't add the USDC trustline on Stellar testnet." };
    }
    return { ok: true, friendbot, trustline: !yaUsdc };
  } catch {
    return { ok: false, aviso: "We couldn't add the USDC trustline on Stellar testnet." };
  }
}

async function leer(respuesta: Response): Promise<Record<string, unknown>> {
  try {
    const json = (await respuesta.json()) as unknown;
    if (!json || typeof json !== "object") return {};
    return json as Record<string, unknown>;
  } catch {
    return {};
  }
}

function avisoDe(cuerpo: Record<string, unknown>): string {
  return typeof cuerpo.aviso === "string" && cuerpo.aviso.trim() ? cuerpo.aviso.trim() : AVISO_ALTA;
}
