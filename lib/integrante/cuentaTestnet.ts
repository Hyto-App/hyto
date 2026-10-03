import { redStellar } from "@/lib/escrow/saldo";
import { AVISO_FAUCET_TESTNET, AVISO_LECTURA_CUENTA, AVISO_SOLO_TESTNET } from "@/lib/integrante/avisosRed";
import { HORIZON_TESTNET } from "@/lib/integrante/trustline";

/**
 * Opens a classic Stellar account on TESTNET with the public Friendbot faucet.
 *
 * Two entry points (keep both):
 *
 * 1. Sign up / new user — `POST /api/sesion/wallet` with `{ wallet, alta: true }`.
 *    `POST /api/sesion` returns `nuevo: true` when that request created the user
 *    row. `entrarConCodigo` and `entrarConGoogle` forward it as `alta`.
 *    Returning Sign in must omit `alta` so an existing wallet is not funded again.
 *    When the Sign up and Sign in buttons land, send `alta: true` only from Sign up.
 *
 * 2. Get ready to be paid — `POST /api/usdc` `{ accion: "preparar" }` is
 *    idempotent. If the account is still missing, it funds on testnet and then
 *    returns the USDC changeTrust. Do not remove that call when wiring the
 *    Sign up gate: it covers a new user whose login provisioning did not finish.
 *
 * `HYTO_STELLAR_NETWORK=public` or `mainnet` never calls Friendbot.
 */
export const FRIENDBOT_TESTNET = "https://friendbot.stellar.org";

const PAUSAS_MS = [0, 250, 500];

export type CuentaTestnet = {
  sequence?: unknown;
  balances?: { asset_code?: string; asset_issuer?: string; asset_type?: string; balance?: string }[];
};

export type ResultadoCuenta =
  | { ok: true; cuenta: CuentaTestnet; creada: boolean }
  | { ok: false; motivo: "lectura" | "faucet" | "mainnet" };

export type OpcionesCuentaTestnet = {
  fetch?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  esperar?: (ms: number) => Promise<void>;
};

export function avisoDeCuenta(resultado: ResultadoCuenta): string | null {
  if (resultado.ok) return null;
  if (resultado.motivo === "mainnet") return AVISO_SOLO_TESTNET;
  if (resultado.motivo === "lectura") return AVISO_LECTURA_CUENTA;
  return AVISO_FAUCET_TESTNET;
}

export async function asegurarCuentaEnTestnet(wallet: string, opciones: OpcionesCuentaTestnet = {}): Promise<ResultadoCuenta> {
  const fetchImpl = opciones.fetch ?? fetch;
  const env = opciones.env ?? process.env;
  const esperar = opciones.esperar ?? esperarMs;

  let cuenta: CuentaTestnet | null;
  try {
    cuenta = await leerCuentaTestnet(wallet, fetchImpl);
  } catch {
    return { ok: false, motivo: "lectura" };
  }
  if (cuenta) return { ok: true, cuenta, creada: false };
  if (redStellar(env) !== "testnet") return { ok: false, motivo: "mainnet" };

  const fondeo = await pedirFriendbot(wallet, fetchImpl);
  if (fondeo === "fallo") return { ok: false, motivo: "faucet" };

  for (let i = 0; i < PAUSAS_MS.length; i += 1) {
    const pausa = PAUSAS_MS[i] ?? 0;
    if (pausa > 0) await esperar(pausa);
    try {
      cuenta = await leerCuentaTestnet(wallet, fetchImpl);
    } catch {
      return { ok: false, motivo: "lectura" };
    }
    if (cuenta) return { ok: true, cuenta, creada: true };
  }
  return { ok: false, motivo: "faucet" };
}

export async function leerCuentaTestnet(wallet: string, fetchImpl: typeof fetch): Promise<CuentaTestnet | null> {
  const respuesta = await fetchImpl(`${HORIZON_TESTNET}/accounts/${encodeURIComponent(wallet)}`, {
    signal: AbortSignal.timeout(4000),
  });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error("lectura");
  const cuerpo = (await respuesta.json()) as CuentaTestnet;
  if (!cuerpo || typeof cuerpo !== "object") throw new Error("lectura");
  return cuerpo;
}

async function pedirFriendbot(wallet: string, fetchImpl: typeof fetch): Promise<"ok" | "ya" | "fallo"> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${FRIENDBOT_TESTNET}?addr=${encodeURIComponent(wallet)}`, {
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return "fallo";
  }
  if (respuesta.ok) return "ok";
  const texto = await respuesta.text().catch(() => "");
  if (/already funded|already exists|op_already_exists/i.test(texto)) return "ya";
  return "fallo";
}

function esperarMs(ms: number): Promise<void> {
  return new Promise((resolver) => {
    setTimeout(resolver, ms);
  });
}
