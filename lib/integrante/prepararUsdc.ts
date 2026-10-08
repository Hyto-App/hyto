import { AVISO_CONFIG } from "@/lib/auth/errores";
import {
  AVISO_DEMO_FIRMA,
  AVISO_DISPOSITIVO,
  AVISO_PASSKEY,
  AVISO_RECHAZO,
  AVISO_REINGRESO,
  AVISO_SESION_CAVOS,
  AVISO_XLM,
  type BilleteraSesion,
  conectarBilleteraDeSesion,
  ErrorFirmaCliente,
  firmanteDe,
  traducirFirma,
} from "@/lib/escrow/firmarCliente";
import { bajarCapasParaCavos } from "@/lib/escrow/capaCavos";
import { AVISO_USDC_LENTO, AVISO_USDC_OTRA_CUENTA, AVISO_USDC_SIN_XLM, CODIGO_USDC_SIN_XLM } from "./avisosUsdc";
import { USDC } from "./identidades";

export type UsdcListo = {
  hash: string | null;
};

export type OpcionesUsdc = {
  fetch?: typeof fetch;
  conectar?: () => Promise<BilleteraSesion>;
  topeMs?: number;
};

/** Cavos answers through its vault iframe and sets no deadline on a call. */
export const TOPE_CAVOS_MS = 60_000;

const AVISO_LISTO = "We couldn't get this account ready to receive payment. Try again.";
const AVISO_CONFIRMAR = "We couldn't confirm the payout setup. Try again.";
const AVISO_DEMO_COBRO = "Demo mode can't set up payouts. Sign in with your email to continue.";

type Respuesta = { ok: boolean; cuerpo: Record<string, unknown> };

export async function leerEstadoUsdc(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const respuesta = await fetchImpl("/api/usdc", { method: "GET", cache: "no-store" });
  const cuerpo = await leer(respuesta);
  if (respuesta.status === 401) throw new Error("Sign in to continue.");
  if (!respuesta.ok) throw new Error(aviso(cuerpo, "We couldn't check whether this account can receive payment. Try again."));
  return cuerpo.listo === true;
}

/**
 * Safe to run again: the server answers `listo` once the trustline is on the ledger, and a 409
 * `usdc_sin_xlm` sends an account with no XLM of its own to the sponsored trustline instead.
 */
export async function prepararUsdcDeSesion(opciones: OpcionesUsdc = {}): Promise<UsdcListo> {
  const fetchImpl = opciones.fetch ?? fetch;
  const topeMs = opciones.topeMs ?? TOPE_CAVOS_MS;
  const preparado = await pedir(fetchImpl, { accion: "preparar" });
  if (!preparado) throw new Error(AVISO_LISTO);
  const sinXlm = preparado.cuerpo.codigo === CODIGO_USDC_SIN_XLM;
  if (!preparado.ok && !sinXlm) throw new Error(aviso(preparado.cuerpo, AVISO_LISTO));
  const xdr = texto(preparado.cuerpo.xdr);
  if (preparado.cuerpo.listo === true && !xdr) return { hash: null };
  if (!sinXlm && !xdr) throw new Error(AVISO_LISTO);

  const conectar = opciones.conectar ?? conectarBilleteraDeSesion;
  const billetera = await enCavos(async () => firmanteDe(await conectar()), topeMs);
  const cuenta = texto(preparado.cuerpo.wallet);
  if (cuenta && billetera.address !== cuenta) throw new Error(AVISO_USDC_OTRA_CUENTA);
  if (sinXlm || !xdr) return patrocinar(billetera, fetchImpl, topeMs);

  const firmado = (await enCavos(() => billetera.signXdr(xdr), topeMs)).trim();
  if (!firmado) throw new Error(AVISO_CONFIRMAR);
  const enviado = await pedir(fetchImpl, { accion: "enviar", xdr: firmado });
  if (!enviado) {
    // The answer can be lost after Horizon applied the trustline.
    if (await usdcListo(fetchImpl)) return { hash: null };
    throw new Error(AVISO_LISTO);
  }
  if (enviado.ok) return { hash: texto(enviado.cuerpo.hash) };
  if (enviado.cuerpo.codigo === CODIGO_USDC_SIN_XLM) return patrocinar(billetera, fetchImpl, topeMs);
  throw new Error(aviso(enviado.cuerpo, AVISO_LISTO));
}

/** The Cavos relayer pays the reserve and the fee of a sponsored trustline, as it does at sign up. */
async function patrocinar(billetera: BilleteraSesion, fetchImpl: typeof fetch, topeMs: number): Promise<UsdcListo> {
  const restaurar = bajarCapasParaCavos();
  try {
    const hash = await conTope(billetera.addTrustline({ code: USDC.code, issuer: USDC.issuer }), topeMs);
    return { hash: texto(hash) };
  } catch (error) {
    if (await usdcListo(fetchImpl)) return { hash: null };
    if (/relay failed/i.test(mensajeDe(error))) {
      avisar(error);
      throw new Error(AVISO_USDC_SIN_XLM);
    }
    const visible = traducir(error);
    throw new Error(visible === AVISO_CONFIRMAR || visible === AVISO_XLM ? AVISO_USDC_SIN_XLM : visible);
  } finally {
    restaurar();
  }
}

async function enCavos<T>(paso: () => Promise<T>, topeMs: number): Promise<T> {
  const restaurar = bajarCapasParaCavos();
  try {
    return await conTope(paso(), topeMs);
  } catch (error) {
    throw new Error(traducir(error));
  } finally {
    restaurar();
  }
}

function conTope<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const tope = new Promise<never>((_, rechazar) => {
    reloj = setTimeout(() => rechazar(new Error(AVISO_USDC_LENTO)), ms);
  });
  return Promise.race([promesa, tope]).finally(() => clearTimeout(reloj));
}

async function usdcListo(fetchImpl: typeof fetch): Promise<boolean> {
  try {
    return await leerEstadoUsdc(fetchImpl);
  } catch {
    return false;
  }
}

async function pedir(fetchImpl: typeof fetch, cuerpo: Record<string, unknown>): Promise<Respuesta | null> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl("/api/usdc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    return null;
  }
  if (respuesta.status === 401) throw new Error("Sign in to continue.");
  return { ok: respuesta.ok, cuerpo: await leer(respuesta) };
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

function aviso(cuerpo: Record<string, unknown>, porDefecto: string): string {
  return texto(cuerpo.aviso) ?? porDefecto;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

function traducir(error: unknown): string {
  const firma = mensajeDe(error) === AVISO_USDC_LENTO ? null : traducirFirma(error);
  if (firma?.message === AVISO_RECHAZO) return AVISO_RECHAZO;
  avisar(error);
  if (!firma) return AVISO_USDC_LENTO;
  if (firma.message === AVISO_SESION_CAVOS) return AVISO_REINGRESO;
  if (firma.message === AVISO_DEMO_FIRMA) return AVISO_DEMO_COBRO;
  if ([AVISO_XLM, AVISO_DISPOSITIVO, AVISO_PASSKEY, AVISO_CONFIG].includes(firma.message)) return firma.message;
  return AVISO_CONFIRMAR;
}

function avisar(error: unknown): void {
  console.warn("[usdc] Cavos did not confirm the payout setup:", detalle(error));
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === "string" ? error : "";
}

/** The raw Cavos error for the browser console, without an email, a token, or a long XDR. */
function detalle(error: unknown): string {
  const estado = error instanceof ErrorFirmaCliente && error.codigo ? `${error.codigo}: ` : "";
  return `${estado}${mensajeDe(error)}`
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}/gi, "[email]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, "[token]")
    .replace(/[A-Za-z0-9+/=_-]{48,}/g, "[…]")
    .slice(0, 300);
}
