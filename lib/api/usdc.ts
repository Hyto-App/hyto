import type { SesionFila } from "@/lib/db/tipos";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { xdrDemasiadoLargo } from "@/lib/escrow/limite";
import {
  AVISO_USDC_FIRMANTE,
  AVISO_USDC_PENDIENTE,
  AVISO_USDC_SECUENCIA,
  AVISO_USDC_SIN_XLM,
  AVISO_USDC_VENCIDO,
  CODIGO_USDC_SIN_XLM,
} from "@/lib/integrante/avisosUsdc";
import { abrirCuentaTestnet, leerCuentaTestnet, type OpcionesCuentaTestnet } from "@/lib/integrante/friendbot";
import { armarXdrUsdc, HORIZON_TESTNET, revisarXdrUsdc } from "@/lib/integrante/trustline";
import { cuentaTieneUsdc, estadoCobro } from "@/lib/integrante/usdc";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { json } from "./json";

export const AVISO_USDC_DEMO = "Payout setup stays off in this practice session. You can still look around. No money moves in the demo.";
export const AVISO_USDC_SIN_WALLET = "Sign in again before setting up payouts.";
export const AVISO_USDC_SIN_CUENTA = "We couldn't open this payout account on the test network. Try again.";
export const AVISO_USDC_SOLO_TESTNET = "Payout accounts are only opened on the test network.";
export const AVISO_USDC_XDR = "That confirmation doesn't match this account. Try again.";
export const AVISO_USDC_ENVIO = "We couldn't finish setting up payouts. Try again.";
export const AVISO_USDC_LECTURA = "We couldn't check the payout account. Try again.";

type OpcionesUsdc = Omit<OpcionesCuentaTestnet, "fetch">;

type EnvioHorizon =
  | { ok: true; hash: string }
  | { ok: false; estado: number | null; transaccion: string | null; operaciones: string[]; motivo: string | null };

type CuerpoHorizon = {
  hash?: unknown;
  successful?: unknown;
  extras?: { result_codes?: { transaction?: unknown; operations?: unknown } };
};

export async function leerUsdcHttp(sesion: SesionFila, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const rechazo = rechazoDe(sesion);
  if (rechazo) return rechazo;
  const wallet = sesion.wallet.trim();
  const cuenta = await leerCuentaTestnet(wallet, fetchImpl);
  if (cuenta === "fallo") {
    registrar("leer", wallet, { motivo: "lectura" });
    return json({ aviso: AVISO_USDC_LECTURA }, 502);
  }
  if (!cuenta) return json({ listo: false });
  return json({ listo: cuentaTieneUsdc(cuenta) });
}

export async function publicarUsdcHttp(
  sesion: SesionFila,
  request: Request,
  fetchImpl: typeof fetch = fetch,
  opciones: OpcionesUsdc = {},
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
  const motivo = revisarXdrUsdc(xdr, wallet);
  if (motivo) {
    registrar("enviar", wallet, { motivo: `xdr_${motivo}` });
    return json({ aviso: AVISO_USDC_XDR }, 400);
  }
  return enviar(wallet, xdr, fetchImpl);
}

function rechazoDe(sesion: SesionFila): Response | null {
  if (sesionEsDemo(sesion)) return json({ aviso: AVISO_USDC_DEMO }, 403);
  if (!esCuenta(sesion.wallet.trim())) return json({ aviso: AVISO_USDC_SIN_WALLET }, 400);
  return null;
}

async function preparar(wallet: string, fetchImpl: typeof fetch, opciones: OpcionesUsdc): Promise<Response> {
  const red = await abrirCuentaTestnet(wallet, { ...opciones, fetch: fetchImpl });
  if (!red.ok) {
    registrar("preparar", wallet, { motivo: red.motivo });
    if (red.motivo === "lectura") return json({ aviso: AVISO_USDC_LECTURA }, 502);
    if (red.motivo === "mainnet") return json({ aviso: AVISO_USDC_SOLO_TESTNET }, 400);
    return json({ aviso: AVISO_USDC_SIN_CUENTA }, 502);
  }
  const estado = estadoCobro(red.cuenta);
  if (estado === "listo") return json({ listo: true });
  const { sequence: crudo } = red.cuenta;
  const sequence = typeof crudo === "string" || typeof crudo === "number" ? String(crudo) : "";
  if (!/^\d+$/.test(sequence)) {
    registrar("preparar", wallet, { motivo: "secuencia" });
    return json({ aviso: AVISO_USDC_LECTURA }, 502);
  }
  if (estado === "sin_xlm") {
    registrar("preparar", wallet, { motivo: "sin_xlm" });
    return json({ aviso: AVISO_USDC_SIN_XLM, codigo: CODIGO_USDC_SIN_XLM, wallet }, 409);
  }
  return json({ xdr: armarXdrUsdc(wallet, sequence), wallet });
}

async function enviar(wallet: string, xdr: string, fetchImpl: typeof fetch): Promise<Response> {
  const envio = await enviarHorizon(xdr, fetchImpl);
  if (envio.ok) return json({ listo: true, hash: envio.hash });
  registrar("enviar", wallet, {
    estado: envio.estado,
    transaccion: envio.transaccion,
    operaciones: envio.operaciones,
    motivo: envio.motivo,
  });
  // An earlier submit of the same trustline, or this one after a timeout, can already be on the ledger.
  const cuenta = await leerCuentaTestnet(wallet, fetchImpl);
  if (cuenta && cuenta !== "fallo" && cuentaTieneUsdc(cuenta)) return json({ listo: true, hash: null });
  return respuestaDeFallo(envio, wallet);
}

function respuestaDeFallo(envio: Extract<EnvioHorizon, { ok: false }>, wallet: string): Response {
  const codigos = [envio.transaccion, ...envio.operaciones];
  if (codigos.includes("tx_insufficient_balance") || codigos.includes("op_low_reserve")) {
    return json({ aviso: AVISO_USDC_SIN_XLM, codigo: CODIGO_USDC_SIN_XLM, wallet }, 409);
  }
  if (envio.transaccion === "tx_bad_seq") return json({ aviso: AVISO_USDC_SECUENCIA }, 409);
  if (envio.transaccion === "tx_too_late") return json({ aviso: AVISO_USDC_VENCIDO }, 409);
  if (envio.transaccion === "tx_bad_auth" || envio.transaccion === "tx_bad_auth_extra") {
    return json({ aviso: AVISO_USDC_FIRMANTE }, 400);
  }
  if (envio.estado === null || envio.estado === 504) return json({ aviso: AVISO_USDC_PENDIENTE }, 502);
  return json({ aviso: AVISO_USDC_ENVIO }, 502);
}

async function enviarHorizon(xdr: string, fetchImpl: typeof fetch): Promise<EnvioHorizon> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${HORIZON_TESTNET}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ tx: xdr }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    return { ok: false, estado: null, transaccion: null, operaciones: [], motivo: error instanceof Error ? error.name : "red" };
  }
  const cuerpo = (await respuesta.json().catch(() => null)) as CuerpoHorizon | null;
  const hash = cuerpo && typeof cuerpo.hash === "string" ? cuerpo.hash.trim() : "";
  if (respuesta.ok && hash && cuerpo?.successful !== false) return { ok: true, hash };
  const codigos = cuerpo?.extras?.result_codes;
  const operaciones = Array.isArray(codigos?.operations) ? codigos.operations : [];
  return {
    ok: false,
    estado: respuesta.status,
    transaccion: typeof codigos?.transaction === "string" ? codigos.transaction : null,
    operaciones: operaciones.filter((codigo): codigo is string => typeof codigo === "string"),
    motivo: null,
  };
}

// Never the session token, the email, or the XDR.
function registrar(paso: "leer" | "preparar" | "enviar", wallet: string, datos: Record<string, unknown>): void {
  console.warn("[api/usdc]", { paso, cuenta: `${wallet.slice(0, 4)}…${wallet.slice(-4)}`, ...datos });
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
