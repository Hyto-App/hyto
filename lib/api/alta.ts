import type { SesionFila } from "@/lib/db/tipos";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { asegurarCuentaTestnet } from "@/lib/integrante/friendbot";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { COOKIE_ALTA, leerCookie } from "@/lib/sesion/cookie";
import { AVISO_USDC_DEMO, AVISO_USDC_SIN_WALLET } from "./usdc";
import { json } from "./json";

export const AVISO_ALTA_SOLO_SIGNUP = "Testnet setup runs only when you sign up.";

export async function publicarAltaHttp(
  sesion: SesionFila,
  request: Request,
  fetchImpl: typeof fetch = fetch,
  esperar?: (ms: number) => Promise<void>,
): Promise<Response> {
  if (leerCookie(request, COOKIE_ALTA) !== "1") return json({ aviso: AVISO_ALTA_SOLO_SIGNUP }, 403);
  if (sesionEsDemo(sesion)) return json({ aviso: AVISO_USDC_DEMO }, 403);
  const wallet = sesion.wallet.trim();
  if (!esCuenta(wallet)) return json({ aviso: AVISO_USDC_SIN_WALLET }, 400);
  try {
    const red = await asegurarCuentaTestnet(wallet, fetchImpl, esperar);
    return json({ cuenta: true, friendbot: red.friendbot, usdc: red.usdc });
  } catch (error) {
    const aviso = error instanceof Error && error.message.trim() ? error.message : "We couldn't fund the testnet account. Try Sign up again.";
    return json({ aviso }, 502);
  }
}
