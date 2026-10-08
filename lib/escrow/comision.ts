import { FeeBumpTransaction, Networks, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";

/**
 * Escrow fees are paid on Stellar testnet by the session account. Trustless Work v2
 * rejects fee-bumps, and Friendbot only creates an account: it does not add XLM to one
 * that already exists. A Cavos account is created by the relayer with no spendable XLM.
 */
export const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
export const CODIGO_XLM_COMISION = "xlm_sin_comision";
export const AVISO_XLM_COMISION =
  "We could not cover the cost of sending this. Try again in 5 minutes. If it keeps happening, [[ayuda]].";
const AVISO_SIN_CUENTA = "This wallet is not on the network yet.";

const RESERVA_BASE = 5_000_000n;

type CuentaHorizon = {
  balances?: { asset_type?: string; balance?: string; selling_liabilities?: string }[];
  subentry_count?: unknown;
  num_sponsoring?: unknown;
  num_sponsored?: unknown;
};

export function comisionDeXdr(xdr: string): bigint | null {
  try {
    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    if (tx instanceof FeeBumpTransaction || !(tx instanceof Transaction)) return null;
    const comision = BigInt(tx.fee);
    return comision > 0n ? comision : null;
  } catch {
    return null;
  }
}

/** Spendable testnet XLM in stroops. Null when the account payload is not enough to decide. Zero when it cannot pay a fee. */
export function xlmDisponible(cuenta: CuentaHorizon | null): bigint | null {
  if (!cuenta) return null;
  const nativo = (cuenta.balances ?? []).find((saldo) => saldo.asset_type === "native");
  const saldo = stroops(nativo?.balance);
  if (saldo === null) return null;
  const subentradas = entero(cuenta.subentry_count);
  if (subentradas === null) return saldo === 0n ? 0n : null;
  const venta = stroops(nativo?.selling_liabilities ?? "0") ?? 0n;
  const minimo =
    (2n + subentradas + (entero(cuenta.num_sponsoring) ?? 0n) - (entero(cuenta.num_sponsored) ?? 0n)) * RESERVA_BASE;
  const libre = saldo - venta - minimo;
  return libre > 0n ? libre : 0n;
}

/**
 * Rejects a signature the account cannot pay for. Without an XDR, a zero spendable balance is enough:
 * every escrow step has a fee. With an XDR, the fee parsed from that testnet transaction is the bar.
 * A Horizon miss does not block; the submit still fails closed if the account is short.
 */
export async function rechazoSiComision(
  wallet: string,
  xdr?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response | null> {
  const comision = xdr === undefined ? 1n : comisionDeXdr(xdr);
  if (comision === null) return null;
  const direccion = wallet.trim();
  if (!/^G[A-Z2-7]{55}$/.test(direccion)) return null;
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(`${HORIZON_TESTNET}/accounts/${encodeURIComponent(direccion)}`, {
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    return null;
  }
  if (respuesta.status === 404) {
    return Response.json({ aviso: AVISO_SIN_CUENTA, codigo: CODIGO_XLM_COMISION }, { status: 400 });
  }
  if (!respuesta.ok) return null;
  let json: unknown;
  try {
    json = await respuesta.json();
  } catch {
    return null;
  }
  const libre = xlmDisponible(json as CuentaHorizon);
  if (libre === null || libre >= comision) return null;
  return Response.json({ aviso: AVISO_XLM_COMISION, codigo: CODIGO_XLM_COMISION }, { status: 409 });
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
