import { AVISO_CONFIG } from "@/lib/auth/errores";
import {
  AVISO_DEMO_FIRMA,
  AVISO_RECHAZO,
  AVISO_REINGRESO,
  AVISO_SESION_CAVOS,
  AVISO_XLM,
  ErrorFirmaCliente,
  firmarXdrDeSesion,
} from "@/lib/escrow/firmarCliente";

export type UsdcListo = {
  hash: string | null;
};

export async function leerEstadoUsdc(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const respuesta = await fetchImpl("/api/usdc", { method: "GET", cache: "no-store" });
  const cuerpo = await leer(respuesta);
  if (respuesta.status === 401) throw new Error("Sign in to continue.");
  if (!respuesta.ok) throw new Error(aviso(cuerpo, "We couldn't check whether this account can receive payment. Try again."));
  return cuerpo.listo === true;
}

export async function prepararUsdcDeSesion(
  opciones: { fetch?: typeof fetch; firmar?: (xdr: string) => Promise<string> } = {},
): Promise<UsdcListo> {
  const fetchImpl = opciones.fetch ?? fetch;
  const preparado = await post(fetchImpl, { accion: "preparar" });
  if (preparado.listo === true && typeof preparado.xdr !== "string") return { hash: null };
  const xdr = typeof preparado.xdr === "string" ? preparado.xdr.trim() : "";
  if (!xdr) throw new Error("We couldn't get this account ready to receive payment. Try again.");
  let firmado = "";
  try {
    firmado = (await (opciones.firmar ?? firmarXdrDeSesion)(xdr)).trim();
  } catch (error) {
    throw new Error(traducir(error));
  }
  if (!firmado) throw new Error("We couldn't confirm the payout setup. Try again.");
  const enviado = await post(fetchImpl, { accion: "enviar", xdr: firmado });
  return { hash: typeof enviado.hash === "string" && enviado.hash.trim() ? enviado.hash.trim() : null };
}

async function post(fetchImpl: typeof fetch, cuerpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl("/api/usdc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new Error("We couldn't get this account ready to receive payment. Try again.");
  }
  const json = await leer(respuesta);
  if (respuesta.status === 401) throw new Error("Sign in to continue.");
  if (!respuesta.ok) throw new Error(aviso(json, "We couldn't get this account ready to receive payment. Try again."));
  return json;
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
  return typeof cuerpo.aviso === "string" && cuerpo.aviso.trim() ? cuerpo.aviso.trim() : porDefecto;
}

function traducir(error: unknown): string {
  if (error instanceof ErrorFirmaCliente) {
    if (error.message === AVISO_RECHAZO) return AVISO_RECHAZO;
    if (error.message === AVISO_XLM) return AVISO_XLM;
    if (error.message === AVISO_SESION_CAVOS) return AVISO_REINGRESO;
    if (error.message === AVISO_DEMO_FIRMA) return "Demo mode can't set up payouts. Sign in with your email to continue.";
    if (error.message === AVISO_CONFIG || error.message === "Cavos is not configured for sign-in.") return AVISO_CONFIG;
    return "We couldn't confirm the payout setup. Try again.";
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "We couldn't confirm the payout setup. Try again.";
}
