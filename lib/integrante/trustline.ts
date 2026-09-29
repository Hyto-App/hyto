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
  let tx: FeeBumpTransaction | Transaction;
  try {
    tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  } catch {
    return false;
  }
  if (tx instanceof FeeBumpTransaction || !(tx instanceof Transaction)) return false;
  if (tx.networkPassphrase !== Networks.TESTNET) return false;
  if (tx.source !== wallet || tx.operations.length !== 1) return false;
  const op = tx.operations[0];
  if (!op || op.type !== "changeTrust" || !(op.line instanceof Asset)) return false;
  if (op.source && op.source !== wallet) return false;
  if (op.line.code !== USDC.code || op.line.issuer !== USDC.issuer) return false;
  if (!(Number(op.limit) > 0)) return false;
  let clave: Keypair;
  try {
    clave = Keypair.fromPublicKey(wallet);
  } catch {
    return false;
  }
  const resumen = tx.hash();
  return tx.signatures.some((firma) => {
    try {
      return clave.verify(resumen, firma.signature);
    } catch {
      return false;
    }
  });
}
