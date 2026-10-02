import { cuentaTieneUsdc } from "./usdc";
import { HORIZON_TESTNET } from "./trustline";

export const FRIENDBOT_TESTNET = "https://friendbot.stellar.org";

const HOST_HORIZON = "horizon-testnet.stellar.org";
const HOST_FRIENDBOT = "friendbot.stellar.org";

type Saldo = {
  asset_code?: string;
  asset_issuer?: string;
};

type CuentaHorizon = {
  balances?: Saldo[];
};

type Detalle = { estado: "existe"; cuenta: CuentaHorizon } | { estado: "ausente" } | { estado: "fallo" };

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

export async function asegurarCuentaTestnet(
  direccion: string,
  fetchImpl: typeof fetch = fetch,
  esperar: (ms: number) => Promise<void> = espera,
): Promise<{ friendbot: boolean; usdc: boolean }> {
  const primera = await leerDetalle(direccion, fetchImpl);
  if (primera.estado === "existe") return { friendbot: false, usdc: cuentaTieneUsdc(primera.cuenta) };
  if (primera.estado === "fallo") throw new Error("We couldn't check the testnet account. Try again.");

  const url = urlFriendbotTestnet(direccion);
  if (!esLlamadaTestnet(url, HOST_FRIENDBOT)) throw new Error("Stellar setup stays on testnet.");
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new Error("Friendbot couldn't fund this testnet account. Try Sign up again.");
  }
  if (!respuesta.ok) throw new Error("Friendbot couldn't fund this testnet account. Try Sign up again.");

  for (let intento = 0; intento < 6; intento += 1) {
    const siguiente = await leerDetalle(direccion, fetchImpl);
    if (siguiente.estado === "existe") return { friendbot: true, usdc: cuentaTieneUsdc(siguiente.cuenta) };
    if (siguiente.estado === "fallo") throw new Error("We couldn't check the testnet account. Try again.");
    await esperar(400);
  }
  throw new Error("Friendbot replied, but the testnet account is not visible yet. Try Sign up again.");
}

async function leerDetalle(direccion: string, fetchImpl: typeof fetch): Promise<Detalle> {
  const url = urlCuentaTestnet(direccion);
  if (!esLlamadaTestnet(url, HOST_HORIZON)) throw new Error("Stellar setup stays on testnet.");
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(url, { signal: AbortSignal.timeout(4000) });
  } catch {
    return { estado: "fallo" };
  }
  if (respuesta.status === 404) return { estado: "ausente" };
  if (!respuesta.ok) return { estado: "fallo" };
  try {
    const cuenta = (await respuesta.json()) as CuentaHorizon;
    if (!cuenta || typeof cuenta !== "object") return { estado: "fallo" };
    return { estado: "existe", cuenta };
  } catch {
    return { estado: "fallo" };
  }
}

function espera(ms: number): Promise<void> {
  return new Promise((resolver) => {
    setTimeout(resolver, ms);
  });
}
