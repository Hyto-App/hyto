import type { SesionFila } from "@/lib/db/tipos";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { xdrDemasiadoLargo } from "@/lib/escrow/limite";
import { armarXdrUsdc, HORIZON_TESTNET, xdrEsTrustlineUsdc } from "@/lib/integrante/trustline";
import { cuentaTieneUsdc } from "@/lib/integrante/usdc";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { json } from "./json";

export const AVISO_USDC_DEMO = "Demo mode can't set up payouts. Sign in with your email to continue.";
export const AVISO_USDC_SIN_WALLET = "Sign in again before setting up payouts.";
export const AVISO_USDC_SIN_CUENTA = "This account isn't on the test network yet. Sign in again and retry.";
export const AVISO_USDC_XDR = "That confirmation doesn't match this account. Try again.";
export const AVISO_USDC_ENVIO = "We couldn't finish setting up payouts. Try again.";
export const AVISO_USDC_LECTURA = "We couldn't check the payout account. Try again.";

type CuentaHorizon = {
  sequence?: unknown;
  balances?: { asset_code?: string; asset_issuer?: string }[];
};

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
  if (accion === "preparar") return preparar(wallet, fetchImpl);
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

async function preparar(wallet: string, fetchImpl: typeof fetch): Promise<Response> {
  let cuenta: CuentaHorizon | null;
  try {
    cuenta = await leerCuenta(wallet, fetchImpl);
  } catch {
    return json({ aviso: AVISO_USDC_LECTURA }, 502);
  }
  if (!cuenta) return json({ aviso: AVISO_USDC_SIN_CUENTA }, 400);
  if (cuentaTieneUsdc(cuenta)) return json({ listo: true });
  const sequence = typeof cuenta.sequence === "string" || typeof cuenta.sequence === "number" ? String(cuenta.sequence) : "";
  if (!/^\d+$/.test(sequence)) return json({ aviso: AVISO_USDC_LECTURA }, 502);
  return json({ xdr: armarXdrUsdc(wallet, sequence) });
}

async function leerCuenta(wallet: string, fetchImpl: typeof fetch): Promise<CuentaHorizon | null> {
  const respuesta = await fetchImpl(`${HORIZON_TESTNET}/accounts/${encodeURIComponent(wallet)}`, {
    signal: AbortSignal.timeout(4000),
  });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error("lectura");
  const cuerpo = (await respuesta.json()) as CuentaHorizon;
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
