import type { SesionFila } from "@/lib/db/tipos";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { xdrDemasiadoLargo } from "@/lib/escrow/limite";
import { AVISO_FAUCET_TESTNET, AVISO_LECTURA_CUENTA, AVISO_SOLO_TESTNET } from "@/lib/integrante/avisosRed";
import { asegurarCuentaEnTestnet, avisoDeCuenta, type OpcionesCuentaTestnet } from "@/lib/integrante/cuentaTestnet";
import { armarXdrUsdc, HORIZON_TESTNET, xdrEsTrustlineUsdc } from "@/lib/integrante/trustline";
import { cuentaTieneUsdc } from "@/lib/integrante/usdc";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { json } from "./json";

export const AVISO_USDC_DEMO = "Demo mode can't set up payouts. Sign in with your email to continue.";
export const AVISO_USDC_SIN_WALLET = "Sign in again before setting up payouts.";
export const AVISO_USDC_SIN_CUENTA = AVISO_FAUCET_TESTNET;
export const AVISO_USDC_SOLO_TESTNET = AVISO_SOLO_TESTNET;
export const AVISO_USDC_XDR = "That confirmation doesn't match this account. Try again.";
export const AVISO_USDC_ENVIO = "We couldn't finish setting up payouts. Try again.";
export const AVISO_USDC_LECTURA = AVISO_LECTURA_CUENTA;

export async function leerUsdcHttp(sesion: SesionFila, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const rechazo = rechazoDe(sesion);
  if (rechazo) return rechazo;
  try {
    const cuenta = await leerCuenta(sesion.wallet.trim(), fetchImpl);
    if (!cuenta) return json({ listo: false });
    return json({ listo: cuentaTieneUsdc(cuenta) });
  } catch {
    return json({ aviso: AVISO_USDC_LECTURA }, 502);
  }
}

export async function publicarUsdcHttp(
  sesion: SesionFila,
  request: Request,
  fetchImpl: typeof fetch = fetch,
  opciones: Omit<OpcionesCuentaTestnet, "fetch"> = {},
): Promise<Response> {
  const rechazo = rechazoDe(sesion);
  if (rechazo) return rechazo;
  const wallet = sesion.wallet.trim();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const accion = accionDe(body);
  if (!accion) return json({ aviso: "That action is not available." }, 400);
  if (accion === "preparar") return preparar(wallet, fetchImpl, opciones);
  const xdr = xdrDe(body);
  if (!xdr) return json({ aviso: "The signed transaction is missing." }, 400);
  if (xdrDemasiadoLargo(xdr)) return json({ aviso: "The signed transaction is too long." }, 400);
  if (!xdrEsTrustlineUsdc(xdr, wallet)) return json({ aviso: AVISO_USDC_XDR }, 400);
  try {
    const hash = await enviarHorizon(xdr, fetchImpl);
    return json({ listo: true, hash });
  } catch {
    return json({ aviso: AVISO_USDC_ENVIO }, 502);
  }
}

function rechazoDe(sesion: SesionFila): Response | null {
  if (sesionEsDemo(sesion)) return json({ aviso: AVISO_USDC_DEMO }, 403);
  if (!esCuenta(sesion.wallet.trim())) return json({ aviso: AVISO_USDC_SIN_WALLET }, 400);
  return null;
}

async function preparar(
  wallet: string,
  fetchImpl: typeof fetch,
  opciones: Omit<OpcionesCuentaTestnet, "fetch">,
): Promise<Response> {
  const red = await asegurarCuentaEnTestnet(wallet, { ...opciones, fetch: fetchImpl });
  if (!red.ok) {
    const aviso = avisoDeCuenta(red) ?? AVISO_USDC_SIN_CUENTA;
    const status = red.motivo === "mainnet" ? 400 : 502;
    return json({ aviso }, status);
  }
  if (cuentaTieneUsdc(red.cuenta)) return json({ listo: true });
  const sequence =
    typeof red.cuenta.sequence === "string" || typeof red.cuenta.sequence === "number" ? String(red.cuenta.sequence) : "";
  if (!/^\d+$/.test(sequence)) return json({ aviso: AVISO_USDC_LECTURA }, 502);
  return json({ xdr: armarXdrUsdc(wallet, sequence) });
}

async function leerCuenta(
  wallet: string,
  fetchImpl: typeof fetch,
): Promise<{ balances?: { asset_code?: string; asset_issuer?: string }[] } | null> {
  const respuesta = await fetchImpl(`${HORIZON_TESTNET}/accounts/${encodeURIComponent(wallet)}`, {
    signal: AbortSignal.timeout(4000),
  });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error("lectura");
  const cuerpo = (await respuesta.json()) as { balances?: { asset_code?: string; asset_issuer?: string }[] };
  if (!cuerpo || typeof cuerpo !== "object") throw new Error("lectura");
  return cuerpo;
}

async function enviarHorizon(xdr: string, fetchImpl: typeof fetch): Promise<string> {
  const respuesta = await fetchImpl(`${HORIZON_TESTNET}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: xdr }),
    signal: AbortSignal.timeout(15000),
  });
  const cuerpo = (await respuesta.json().catch(() => null)) as { hash?: unknown; successful?: unknown } | null;
  const hash = cuerpo && typeof cuerpo.hash === "string" ? cuerpo.hash.trim() : "";
  if (!respuesta.ok || !hash || cuerpo?.successful === false) throw new Error("envio");
  return hash;
}

function accionDe(body: unknown): "preparar" | "enviar" | null {
  if (!body || typeof body !== "object") return null;
  const accion = (body as { accion?: unknown }).accion;
  if (accion === "preparar" || accion === "enviar") return accion;
  return null;
}

function xdrDe(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const xdr = (body as { xdr?: unknown }).xdr;
  if (typeof xdr !== "string") return null;
  const limpio = xdr.trim();
  return limpio ? limpio : null;
}
