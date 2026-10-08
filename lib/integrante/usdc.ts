import { bajarCapasParaCavos } from "@/lib/escrow/capaCavos";
import { esperarCavos } from "@/lib/escrow/firmarCliente";
import { AVISO_USDC_LENTO } from "./avisosUsdc";
import { USDC } from "./identidades";
import { TOPE_CAVOS_MS } from "./prepararUsdc";
import type { BilleteraCobro, CuentaLista } from "./tipos";

type Saldo = {
  asset_code?: string;
  asset_issuer?: string;
  asset_type?: string;
  balance?: string;
  selling_liabilities?: string;
};

type CuentaHorizon = {
  balances?: Saldo[];
  subentry_count?: unknown;
  num_sponsoring?: unknown;
  num_sponsored?: unknown;
};

/** One base reserve, 0.5 XLM, in stroops. */
const RESERVA_BASE = 5_000_000n;
/** The changeTrust from armarXdrUsdc pays BASE_FEE. */
const COMISION = 100n;

export function cuentaTieneUsdc(cuenta: { balances?: Saldo[] } | null): boolean {
  return (cuenta?.balances ?? []).some(
    (saldo) => saldo.asset_code === USDC.code && saldo.asset_issuer === USDC.issuer,
  );
}

/**
 * Whether the account's own XLM pays the reserve a new trustline adds plus the fee. The minimum balance
 * is (2 + subentries + sponsoring - sponsored) base reserves, and selling liabilities can't be spent.
 * A Cavos account the relayer sponsored holds 0 XLM. Null when Horizon left out a number the sum needs.
 */
export function xlmCubreTrustline(cuenta: CuentaHorizon): boolean | null {
  const nativo = (cuenta.balances ?? []).find((saldo) => saldo.asset_type === "native");
  const saldo = stroops(nativo?.balance);
  const subentradas = entero(cuenta.subentry_count);
  if (saldo === null || subentradas === null) return null;
  const venta = stroops(nativo?.selling_liabilities ?? "0") ?? 0n;
  const minimo = (2n + subentradas + (entero(cuenta.num_sponsoring) ?? 0n) - (entero(cuenta.num_sponsored) ?? 0n)) * RESERVA_BASE;
  return saldo - venta - minimo >= RESERVA_BASE + COMISION;
}

export type EstadoCobro = "sin_cuenta" | "listo" | "sin_xlm" | "falta_trustline";

/** What Get ready to be paid still has to do for this testnet account. */
export function estadoCobro(cuenta: CuentaHorizon | null): EstadoCobro {
  if (!cuenta) return "sin_cuenta";
  if (cuentaTieneUsdc(cuenta)) return "listo";
  return xlmCubreTrustline(cuenta) === false ? "sin_xlm" : "falta_trustline";
}

function stroops(valor: unknown): bigint | null {
  if (typeof valor !== "string") return null;
  const partes = /^(\d+)(?:\.(\d{1,7}))?$/.exec(valor.trim());
  if (!partes) return null;
  return BigInt(partes[1]) * 10_000_000n + BigInt((partes[2] ?? "").padEnd(7, "0"));
}

function entero(valor: unknown): bigint | null {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 ? BigInt(valor) : null;
}

export async function consultarUsdc(direccion: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const respuesta = await fetchImpl(`https://horizon-testnet.stellar.org/accounts/${encodeURIComponent(direccion)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (respuesta.status === 404) return false;
    if (!respuesta.ok) throw new Error("Could not read the account.");
    const json = (await respuesta.json()) as { balances?: Saldo[] };
    return cuentaTieneUsdc(json);
  } catch (error) {
    if (error instanceof Error && error.message === "Could not read the account.") throw error;
    throw new Error("Could not read the account.");
  }
}

export async function asegurarCobroUsdc(
  billetera: BilleteraCobro,
  tieneUsdc: (direccion: string) => Promise<boolean> = consultarUsdc,
): Promise<CuentaLista> {
  if (billetera.status === "needs-device-approval") {
    return {
      direccion: billetera.address,
      usdcListo: false,
      detalle: "This sign-in can't confirm for this account. Sign in again.",
    };
  }

  if (billetera.status === "undeployed") {
    const restaurar = bajarCapasParaCavos();
    try {
      // La cuenta patrocinada nace con 0 XLM. Ese pago de 1 stroop a sí misma
      // puede fallar recién creada; la trustline no depende de él.
      await esperarCavos(billetera.execute(1n, billetera.address), TOPE_CAVOS_MS);
    } catch (error) {
      if (billetera.status === "undeployed") {
        if (error instanceof Error && (error.message === AVISO_USDC_LENTO || /cancelled the confirmation/i.test(error.message))) {
          return { direccion: billetera.address, usdcListo: false, detalle: error.message };
        }
        throw error;
      }
    } finally {
      restaurar();
    }
  }

  if (await tieneUsdc(billetera.address)) {
    return { direccion: billetera.address, usdcListo: true, detalle: null };
  }

  const restaurar = bajarCapasParaCavos();
  try {
    await esperarCavos(billetera.addTrustline({ code: USDC.code, issuer: USDC.issuer }), TOPE_CAVOS_MS);
    return { direccion: billetera.address, usdcListo: true, detalle: null };
  } catch (error) {
    if (error instanceof Error && (error.message === AVISO_USDC_LENTO || /cancelled the confirmation/i.test(error.message))) {
      return { direccion: billetera.address, usdcListo: false, detalle: error.message };
    }
    throw error;
  } finally {
    restaurar();
  }
}
