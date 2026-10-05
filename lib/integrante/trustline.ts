import {
  Account,
  Asset,
  BASE_FEE,
  FeeBumpTransaction,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { USDC } from "./identidades";

export const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";

export function armarXdrUsdc(wallet: string, sequence: string): string {
  const tx = new TransactionBuilder(new Account(wallet, sequence), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: new Asset(USDC.code, USDC.issuer) }))
    .setTimeout(180)
    .build();
  return tx.toXDR();
}

export function xdrEsTrustlineUsdc(xdr: string, wallet: string): boolean {
  return revisarXdrUsdc(xdr, wallet) === null;
}

export type MotivoXdrUsdc = "formato" | "cuenta" | "operacion" | "activo" | "limite" | "firma";

/** Null when the XDR is one testnet USDC changeTrust from `wallet`, signed by `wallet`. */
export function revisarXdrUsdc(xdr: string, wallet: string): MotivoXdrUsdc | null {
  let tx: FeeBumpTransaction | Transaction;
  try {
    tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  } catch {
    return "formato";
  }
  if (tx instanceof FeeBumpTransaction || !(tx instanceof Transaction)) return "formato";
  if (tx.networkPassphrase !== Networks.TESTNET) return "formato";
  if (tx.source !== wallet) return "cuenta";
  if (tx.operations.length !== 1) return "operacion";
  const op = tx.operations[0];
  if (!op || op.type !== "changeTrust" || !(op.line instanceof Asset)) return "operacion";
  if (op.source && op.source !== wallet) return "cuenta";
  if (op.line.code !== USDC.code || op.line.issuer !== USDC.issuer) return "activo";
  if (!(Number(op.limit) > 0)) return "limite";
  let clave: Keypair;
  try {
    clave = Keypair.fromPublicKey(wallet);
  } catch {
    return "cuenta";
  }
  const resumen = tx.hash();
  const firmada = tx.signatures.some((firma) => {
    try {
      return clave.verify(resumen, firma.signature);
    } catch {
      return false;
    }
  });
  return firmada ? null : "firma";
}
