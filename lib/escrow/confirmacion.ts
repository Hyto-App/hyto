import { FeeBumpTransaction, Networks, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { dormir, type Espera } from "./indexador";

// Escrow work in Hyto is testnet only. This read never follows HYTO_STELLAR_NETWORK.
export const RPC_TESTNET = "https://soroban-testnet.stellar.org";

export type EstadoEnRed = "SUCCESS" | "FAILED" | "NOT_FOUND" | "desconocido";

export type OpcionesConfirmacion = {
  fetch?: typeof fetch;
  esperar?: Espera;
  pausas?: readonly number[];
};

// A testnet ledger closes about every 5 seconds. Keep the total under a serverless request budget.
export const PAUSAS_RED_MS: readonly number[] = [1500, 2500, 3000];

export function hashTestnetDeXdr(xdrFirmado: string): string | null {
  try {
    const tx = TransactionBuilder.fromXDR(xdrFirmado.trim(), Networks.TESTNET);
    const inner = tx instanceof FeeBumpTransaction ? tx.innerTransaction : tx;
    return inner instanceof Transaction ? Buffer.from(inner.hash()).toString("hex") : null;
  } catch {
    return null;
  }
}

export async function estadoEnRed(hash: string, opciones: OpcionesConfirmacion = {}): Promise<EstadoEnRed> {
  if (!/^[a-f0-9]{64}$/i.test(hash)) return "desconocido";
  const fetchImpl = opciones.fetch ?? fetch;
  try {
    const respuesta = await fetchImpl(RPC_TESTNET, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: { hash: hash.toLowerCase() } }),
      signal: AbortSignal.timeout(5000),
    });
    if (!respuesta.ok) return "desconocido";
    const json = (await respuesta.json()) as { result?: { status?: unknown } } | null;
    const estado = json?.result?.status;
    return estado === "SUCCESS" || estado === "FAILED" || estado === "NOT_FOUND" ? estado : "desconocido";
  } catch {
    return "desconocido";
  }
}

// Asks testnet RPC until the transaction is final. NOT_FOUND after the last pause means "not seen yet",
// not "never landed": the transaction can still be applied until its time bound passes.
export async function confirmarEnRed(
  hash: string,
  esperarFinal: boolean,
  opciones: OpcionesConfirmacion = {},
): Promise<EstadoEnRed> {
  const esperar = opciones.esperar ?? dormir;
  const pausas = esperarFinal ? (opciones.pausas ?? PAUSAS_RED_MS) : [];
  let estado: EstadoEnRed = "desconocido";
  for (let intento = 0; intento <= pausas.length; intento += 1) {
    if (intento > 0) await esperar(pausas[intento - 1] ?? 0);
    estado = await estadoEnRed(hash, opciones);
    if (estado !== "NOT_FOUND") return estado;
  }
  return estado;
}
