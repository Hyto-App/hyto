import { cuentaTieneUsdc } from "@/lib/integrante/usdc";
import { HORIZON_TESTNET } from "@/lib/integrante/trustline";
import { esCuenta } from "./cuerpos";
import { direccionFeeDeLiberacion } from "./xdr";

/** Server account that must receive the 0.3% Trustless Work protocol fee. Never read from the client. */
export const NOMBRE_FEE = "HYTO_TRUSTLESS_FEE";

export const CODIGO_FEE_SIN_CONFIG = "HYTO_FEE_SIN_CONFIG";
export const CODIGO_FEE_DISTINTA = "HYTO_FEE_DISTINTA";
export const CODIGO_FEE_SIN_TRUSTLINE = "HYTO_FEE_SIN_TRUSTLINE";
export const CODIGO_FEE_HORIZON = "HYTO_FEE_HORIZON";
export const CODIGO_FEE_ILEGIBLE = "HYTO_FEE_ILEGIBLE";

export const AVISO_FEE_AUSENTE =
  "HYTO_TRUSTLESS_FEE is missing or is not a Stellar account. Set it on the server to the Trustless Work testnet fee account before releasing a milestone.";
export const AVISO_FEE_DISTINTA =
  "This release would send the 0.3% fee to a different account. The server only accepts the account in HYTO_TRUSTLESS_FEE.";
export const AVISO_FEE_SIN_TRUSTLINE =
  "The account in HYTO_TRUSTLESS_FEE has no USDC trustline on Stellar testnet. A release would fail with contract error 13. Open that trustline, then try again.";
export const AVISO_FEE_HORIZON =
  "Could not check the USDC trustline of HYTO_TRUSTLESS_FEE on Stellar testnet. The release was not sent. Try again in a moment.";
export const AVISO_FEE_ILEGIBLE =
  "The release transaction does not name the fee account from HYTO_TRUSTLESS_FEE, so it was not returned for signing.";

const CAMPOS_CLIENTE = ["direccionFee", "trustlessWorkAddress", "feeAddress", "trustless_work_address"] as const;

export type FalloFee = { aviso: string; estado: number; codigo: string };

type EntornoFee = { HYTO_TRUSTLESS_FEE?: string; [clave: string]: string | undefined };

export function configFee(env: EntornoFee = process.env): { direccion: string } | FalloFee {
  const direccion = env.HYTO_TRUSTLESS_FEE?.trim() ?? "";
  if (!esCuenta(direccion)) return { aviso: AVISO_FEE_AUSENTE, estado: 503, codigo: CODIGO_FEE_SIN_CONFIG };
  return { direccion };
}

/** A fee address the client tried to choose. Null when the body does not name one, or it matches the server. */
export function falloSiFeeCliente(body: unknown, direccion: string): FalloFee | null {
  if (!body || typeof body !== "object") return null;
  const datos = body as Record<string, unknown>;
  let vista: string | null = null;
  for (const campo of CAMPOS_CLIENTE) {
    if (!Object.prototype.hasOwnProperty.call(datos, campo)) continue;
    const valor = datos[campo];
    if (valor === undefined || valor === null) continue;
    if (typeof valor !== "string") return distinta();
    const limpio = valor.trim();
    if (!limpio) continue;
    if (vista && vista !== limpio) return distinta();
    vista = limpio;
  }
  if (!vista || vista === direccion) return null;
  return distinta();
}

/** When release_funds names a fee account, it has to be the server one. Other call shapes are not this check. */
export function falloSiFeeDeXdr(crudo: string, env: EntornoFee = process.env): FalloFee | null {
  const fee = direccionFeeDeLiberacion(crudo);
  if (!fee) return null;
  const config = configFee(env);
  if ("aviso" in config) return config;
  if (fee !== config.direccion) return distinta();
  return null;
}

export async function falloSiTrustlineFee(direccion: string, fetchImpl: typeof fetch = fetch): Promise<FalloFee | null> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${HORIZON_TESTNET}/accounts/${encodeURIComponent(direccion)}`, {
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    return horizon();
  }
  if (respuesta.status === 404) return sinTrustline();
  if (!respuesta.ok) return horizon();
  try {
    const json = (await respuesta.json()) as { balances?: { asset_code?: string; asset_issuer?: string }[] } | null;
    if (!json || typeof json !== "object") return horizon();
    return cuentaTieneUsdc(json) ? null : sinTrustline();
  } catch {
    return horizon();
  }
}

export async function rechazoPrevioLiberacion(body: unknown, fetchImpl: typeof fetch = fetch): Promise<Response | null> {
  const config = configFee();
  if ("aviso" in config) return respuesta(config);
  const cliente = falloSiFeeCliente(body, config.direccion);
  if (cliente) return respuesta(cliente);
  const trust = await falloSiTrustlineFee(config.direccion, fetchImpl);
  return trust ? respuesta(trust) : null;
}

export async function rechazoSiFeeAlEnviar(crudo: string, fetchImpl: typeof fetch = fetch): Promise<Response | null> {
  const fallo = falloSiFeeDeXdr(crudo);
  if (fallo) return respuesta(fallo);
  const fee = direccionFeeDeLiberacion(crudo);
  if (!fee) return null;
  const trust = await falloSiTrustlineFee(fee, fetchImpl);
  return trust ? respuesta(trust) : null;
}

function distinta(): FalloFee {
  return { aviso: AVISO_FEE_DISTINTA, estado: 400, codigo: CODIGO_FEE_DISTINTA };
}

function sinTrustline(): FalloFee {
  return { aviso: AVISO_FEE_SIN_TRUSTLINE, estado: 409, codigo: CODIGO_FEE_SIN_TRUSTLINE };
}

function horizon(): FalloFee {
  return { aviso: AVISO_FEE_HORIZON, estado: 503, codigo: CODIGO_FEE_HORIZON };
}

function respuesta(fallo: FalloFee): Response {
  return Response.json({ aviso: fallo.aviso, codigo: fallo.codigo }, { status: fallo.estado });
}
