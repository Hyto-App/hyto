import { AVISO_ALTA_PERSONA, AVISO_ALTA_SIN_CONFIRMAR } from "@/lib/auth/avisoAlta";
import { AVISO_USDC_LENTO } from "./avisosUsdc";
import type { BilleteraCobro } from "./tipos";
import { asegurarCobroUsdc, consultarUsdc } from "./usdc";

export type AltaTestnet =
  | { ok: true; friendbot: boolean; trustline: boolean }
  | { ok: false; aviso: string };

const AVISO_ALTA = "We couldn't finish Stellar testnet setup.";

/**
 * Sign up only. Funds a missing testnet account with Friendbot.
 * A wallet that is already on the ledger and still needs USDC opens it here.
 * A brand-new Cavos wallet does not call the relayer: Friendbot already created the account,
 * and Get ready to be paid opens USDC. Sign in must not call this.
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
  if (yaUsdc) return { ok: true, friendbot, trustline: false };
  // needs-device-approval has no key here. undeployed just came from Friendbot, which
  // already created the classic account. Cavos execute() would then GET/POST
  // cavos.xyz/api/stellar/relay to sponsor another create. That call fails for a
  // new account (the browser reports net::ERR_FAILED) and the trustline does not
  // need it: Get ready to be paid opens USDC with the account's own XLM.
  if (billetera.status === "needs-device-approval") return { ok: false, aviso: AVISO_ALTA_SIN_CONFIRMAR };
  if (billetera.status === "undeployed") return { ok: false, aviso: AVISO_ALTA_PERSONA };
  try {
    const lista = await asegurarCobroUsdc(billetera, (direccion) => consultarUsdc(direccion, fetchImpl));
    if (!lista.usdcListo) {
      return { ok: false, aviso: lista.detalle ?? "We couldn't add the USDC trustline on Stellar testnet." };
    }
    return { ok: true, friendbot, trustline: !yaUsdc };
  } catch (error) {
    const texto = error instanceof Error ? error.message : "";
    if (texto === AVISO_USDC_LENTO || /cancelled the confirmation/i.test(texto)) return { ok: false, aviso: texto };
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
