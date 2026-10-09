import { Account, Address, Contract, Keypair, Networks, TransactionBuilder, scValToNative, xdr } from "@stellar/stellar-sdk";
import { esContrato } from "./cuerpos";
import { USDC_SAC_TESTNET } from "./desplegar";
import { aplicarSaldoRed, balanceNumerico, hayFondos } from "./fondeo";
import { RPC_TESTNET } from "./confirmacion";
import { leerEscrow } from "./modulo";

const DECIMALES_USDC = 7;

export type LectorSaldoRed = (token: string, contrato: string) => Promise<number | null>;

let lectorInstalado: LectorSaldoRed | null = null;

/** Tests install a reader. Production reads testnet. The test runner does neither unless a test asks. */
export function usarLectorSaldoRed(siguiente: LectorSaldoRed | null): void {
  lectorInstalado = siguiente;
}

export function lectorSaldoRedVigente(): LectorSaldoRed | null {
  if (lectorInstalado) return lectorInstalado;
  if (process.env.NODE_TEST_CONTEXT) return null;
  return saldoTokenEnTestnet;
}

export function tokenDeEscrow(escrow: Record<string, unknown>): string {
  const trust = escrow.trustline;
  if (trust && typeof trust === "object") {
    const id = (trust as { contractId?: unknown }).contractId;
    if (typeof id === "string" && esContrato(id.trim())) return id.trim();
  }
  return USDC_SAC_TESTNET;
}

/** Human amount from a SAC `balance` i128, already scaled by the token decimals. */
export function unidadesDeRetval(retval: string, decimales = DECIMALES_USDC): number | null {
  try {
    const nativo = scValToNative(xdr.ScVal.fromXDR(retval, "base64"));
    if (typeof nativo !== "bigint" || nativo < 0n) return null;
    if (nativo === 0n) return 0;
    const escala = 10n ** BigInt(decimales);
    const entero = nativo / escala;
    const frac = (nativo % escala).toString().padStart(decimales, "0");
    const texto = `${entero}.${frac}`.replace(/0+$/, "").replace(/\.$/, "");
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
  } catch {
    return null;
  }
}

export function saldoDeSimulacion(json: unknown, decimales = DECIMALES_USDC): number | null {
  if (!json || typeof json !== "object") return null;
  const result = (json as { result?: unknown }).result;
  if (!result || typeof result !== "object") return null;
  const datos = result as { error?: unknown; results?: unknown };
  if (typeof datos.error === "string" && datos.error.trim()) return null;
  if (!Array.isArray(datos.results)) return null;
  const primero = datos.results[0];
  if (!primero || typeof primero !== "object") return null;
  // Raw RPC puts the return value in `xdr`. The parsed SDK shape uses `retval`.
  const retorno = primero as { retval?: unknown; xdr?: unknown };
  const retval = typeof retorno.retval === "string" && retorno.retval.trim() ? retorno.retval : retorno.xdr;
  if (typeof retval !== "string" || !retval.trim()) return null;
  return unidadesDeRetval(retval, decimales);
}

/**
 * Read-only. Builds an unsigned `balance` invocation and asks testnet RPC to simulate it.
 * Nothing is signed and nothing is submitted.
 */
export async function saldoTokenEnTestnet(
  token: string,
  contrato: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  if (!esContrato(token) || !esContrato(contrato)) return null;
  try {
    const secuencia = await secuenciaDeLedger(fetchImpl);
    const xdrTx = xdrDeBalance(token, contrato, secuencia);
    const respuesta = await fetchImpl(RPC_TESTNET, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "simulateTransaction",
        params: { transaction: xdrTx },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!respuesta.ok) return null;
    return saldoDeSimulacion(await respuesta.json());
  } catch {
    return null;
  }
}

export async function completarEscrow(escrow: Record<string, unknown>): Promise<Record<string, unknown>> {
  const actual = balanceNumerico(escrow.balance);
  if (actual !== null && actual > 0) return escrow;
  const contrato = typeof escrow.contractId === "string" ? escrow.contractId.trim() : "";
  if (!esContrato(contrato)) return escrow;
  const lector = lectorSaldoRedVigente();
  if (!lector) return escrow;
  try {
    return aplicarSaldoRed(escrow, await lector(tokenDeEscrow(escrow), contrato));
  } catch {
    return escrow;
  }
}

/** True when the escrow contract already holds the token, even if Trustless still reports 0. */
export async function escrowYaTieneFondos(contrato: string): Promise<boolean> {
  if (!esContrato(contrato)) return false;
  const lector = lectorSaldoRedVigente();
  if (!lector) return false;
  let token = USDC_SAC_TESTNET;
  let balance: number | null = null;
  try {
    const escrow = await leerEscrow(contrato);
    balance = balanceNumerico(escrow.balance);
    if (balance !== null && balance > 0) return true;
    token = tokenDeEscrow(escrow);
  } catch {
    // The read model can miss a contract whose token balance is already on the ledger.
  }
  try {
    return hayFondos(balance, await lector(token, contrato));
  } catch {
    return false;
  }
}

async function secuenciaDeLedger(fetchImpl: typeof fetch): Promise<string> {
  try {
    const respuesta = await fetchImpl(RPC_TESTNET, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestLedger" }),
      signal: AbortSignal.timeout(4000),
    });
    if (!respuesta.ok) return "0";
    const json = (await respuesta.json()) as { result?: { sequence?: unknown } };
    const secuencia = json.result?.sequence;
    return typeof secuencia === "number" && Number.isFinite(secuencia) ? String(Math.trunc(secuencia)) : "0";
  } catch {
    return "0";
  }
}

function xdrDeBalance(token: string, contrato: string, secuencia: string): string {
  // The source exists only so the unsigned envelope is well formed. It is never signed.
  const fuente = new Account(Keypair.random().publicKey(), secuencia);
  const tx = new TransactionBuilder(fuente, { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(new Contract(token).call("balance", new Address(contrato).toScVal()))
    .setTimeout(30)
    .build();
  return tx.toXDR();
}
