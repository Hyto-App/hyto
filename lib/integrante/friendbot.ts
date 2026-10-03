import { redStellar } from "@/lib/escrow/saldo";
import { cuentaTieneUsdc } from "./usdc";
import { HORIZON_TESTNET } from "./trustline";

/**
 * The only Friendbot helper. Two callers, keep both:
 *
 * 1. Sign up — `POST /api/sesion/alta`, gated by the `hyto_alta` cookie. Sign in never calls it.
 * 2. Get ready to be paid — `POST /api/usdc` `{ accion: "preparar" }`. It covers a new user
 *    whose Sign up provisioning did not finish, before the USDC changeTrust is built.
 *
 * `HYTO_STELLAR_NETWORK=public` or `mainnet` never reaches Friendbot.
 */
export const FRIENDBOT_TESTNET = "https://friendbot.stellar.org";

const HOST_HORIZON = "horizon-testnet.stellar.org";
const HOST_FRIENDBOT = "friendbot.stellar.org";
const REINTENTOS = 6;

export const AVISO_CUENTA_LECTURA = "We couldn't check the testnet account. Try again.";
export const AVISO_CUENTA_FAUCET = "Friendbot couldn't fund this testnet account. Try again.";
export const AVISO_CUENTA_PENDIENTE = "Friendbot replied, but the testnet account is not visible yet. Try again.";
export const AVISO_SOLO_TESTNET = "Stellar setup stays on testnet.";

export type CuentaTestnet = {
  sequence?: unknown;
  balances?: { asset_code?: string; asset_issuer?: string; asset_type?: string; balance?: string }[];
};

export type MotivoCuenta = "lectura" | "faucet" | "pendiente" | "mainnet";

export type ResultadoCuenta = { ok: true; cuenta: CuentaTestnet; friendbot: boolean } | { ok: false; motivo: MotivoCuenta };

export type OpcionesCuentaTestnet = {
  fetch?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  esperar?: (ms: number) => Promise<void>;
};

export function urlCuentaTestnet(direccion: string): string {
  return `${HORIZON_TESTNET}/accounts/${encodeURIComponent(direccion)}`;
}

export function urlFriendbotTestnet(direccion: string): string {
  return `${FRIENDBOT_TESTNET}?addr=${encodeURIComponent(direccion)}`;
}

export function esLlamadaTestnet(url: string, host: typeof HOST_HORIZON | typeof HOST_FRIENDBOT): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === host;
  } catch {
    return false;
  }
}

export function avisoDeMotivo(motivo: MotivoCuenta): string {
  if (motivo === "mainnet") return AVISO_SOLO_TESTNET;
  if (motivo === "lectura") return AVISO_CUENTA_LECTURA;
  if (motivo === "pendiente") return AVISO_CUENTA_PENDIENTE;
  return AVISO_CUENTA_FAUCET;
}

/** Reads the account on testnet Horizon and opens it with Friendbot when it is missing. */
export async function abrirCuentaTestnet(direccion: string, opciones: OpcionesCuentaTestnet = {}): Promise<ResultadoCuenta> {
  const fetchImpl = opciones.fetch ?? fetch;
  const esperar = opciones.esperar ?? espera;

  const primera = await leerCuentaTestnet(direccion, fetchImpl);
  if (primera === "fallo") return { ok: false, motivo: "lectura" };
  if (primera) return { ok: true, cuenta: primera, friendbot: false };
  if (redStellar(opciones.env ?? process.env) !== "testnet") return { ok: false, motivo: "mainnet" };

  const fondeo = await pedirFriendbot(direccion, fetchImpl);
  if (fondeo === "fallo") return { ok: false, motivo: "faucet" };

  for (let intento = 0; intento < REINTENTOS; intento += 1) {
    if (intento > 0) await esperar(400);
    const siguiente = await leerCuentaTestnet(direccion, fetchImpl);
    if (siguiente === "fallo") return { ok: false, motivo: "lectura" };
    if (siguiente) return { ok: true, cuenta: siguiente, friendbot: fondeo === "ok" };
  }
  return { ok: false, motivo: "pendiente" };
}

/** Throwing form used by Sign up. */
export async function asegurarCuentaTestnet(
  direccion: string,
  fetchImpl: typeof fetch = fetch,
  esperar: (ms: number) => Promise<void> = espera,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ friendbot: boolean; usdc: boolean }> {
  const red = await abrirCuentaTestnet(direccion, { fetch: fetchImpl, esperar, env });
  if (!red.ok) throw new Error(avisoDeMotivo(red.motivo));
  return { friendbot: red.friendbot, usdc: cuentaTieneUsdc(red.cuenta) };
}

/** `null` when Horizon answers 404. */
export async function leerCuentaTestnet(direccion: string, fetchImpl: typeof fetch): Promise<CuentaTestnet | null | "fallo"> {
  const url = urlCuentaTestnet(direccion);
  if (!esLlamadaTestnet(url, HOST_HORIZON)) return "fallo";
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(url, { signal: AbortSignal.timeout(4000) });
  } catch {
    return "fallo";
  }
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) return "fallo";
  try {
    const cuenta = (await respuesta.json()) as CuentaTestnet;
    if (!cuenta || typeof cuenta !== "object") return "fallo";
    return cuenta;
  } catch {
    return "fallo";
  }
}

async function pedirFriendbot(direccion: string, fetchImpl: typeof fetch): Promise<"ok" | "ya" | "fallo"> {
  const url = urlFriendbotTestnet(direccion);
  if (!esLlamadaTestnet(url, HOST_FRIENDBOT)) return "fallo";
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
  } catch {
    return "fallo";
  }
  if (respuesta.ok) return "ok";
  // Two tabs can race: the second Friendbot call fails because the first one created the account.
  const texto = await respuesta.text().catch(() => "");
  if (/already funded|already exists|op_already_exists/i.test(texto)) return "ya";
  return "fallo";
}

function espera(ms: number): Promise<void> {
  return new Promise((resolver) => {
    setTimeout(resolver, ms);
  });
}
