import {
  Address,
  FeeBumpTransaction,
  Networks,
  Transaction,
  TransactionBuilder,
  inspectAuthEntry,
  xdr,
} from "@stellar/stellar-sdk";
import { esCuenta } from "./cuerpos";

export type InvocacionFirmada = {
  contrato: string;
  funcion: string;
  firmantes: string[];
};

// El rótulo del cuerpo no dice quién firma. Esta lectura sale del XDR:
// la función del invoke y las cuentas con firma en la autorización Soroban.
// No verifica la firma contra la clave: la red lo hace al aceptar la transacción.
// Si el cliente solo pegó la G… en la sesión, no puede fabricar esta autorización.
export function leerInvocacion(crudo: string, wallet: string | null = null): InvocacionFirmada | null {
  const tx = abrir(crudo);
  if (!tx || tx.operations.length !== 1) return null;
  const op = tx.operations[0] as {
    type?: string;
    func?: { type?: string; invokeContract?: xdr.InvokeContractArgs };
    auth?: xdr.SorobanAuthorizationEntry[];
  };
  if (op?.type !== "invokeHostFunction" || op.func?.type !== "hostFunctionTypeInvokeContract" || !op.func.invokeContract) {
    return null;
  }
  const llamada = op.func.invokeContract;
  let contrato: string;
  try {
    contrato = Address.fromScAddress(llamada.contractAddress).toString();
  } catch {
    return null;
  }
  const funcion = llamada.functionName.toString();
  if (!funcion) return null;
  const firmantes = firmantesDe(tx, op.auth ?? [], funcion, contrato, wallet);
  if (!firmantes || firmantes.length === 0) return null;
  return { contrato, funcion, firmantes };
}

function abrir(crudo: string): Transaction | null {
  for (const red of [Networks.TESTNET, Networks.PUBLIC]) {
    try {
      const tx = TransactionBuilder.fromXDR(crudo, red);
      if (tx instanceof FeeBumpTransaction) return tx.innerTransaction;
      if (tx instanceof Transaction) return tx;
    } catch {
      continue;
    }
  }
  return null;
}

function firmantesDe(
  tx: Transaction,
  auth: xdr.SorobanAuthorizationEntry[],
  funcion: string,
  contrato: string,
  wallet: string | null,
): string[] | null {
  if (auth.length === 0) {
    if (!sobreFirmado(tx) || !esCuenta(tx.source)) return null;
    if (wallet && tx.source !== wallet) return null;
    return [tx.source];
  }
  const vistos = new Set<string>();
  let coincidencias = 0;
  for (const entrada of auth) {
    const info = inspectAuthEntry(entrada);
    // Una G firmada que no es la wallet de la sesión invalida el XDR,
    // aunque autorice otro contrato (por ejemplo transfer). Una credencial
    // de contrato (C…) puede quedar: no es la cuenta de la sesión.
    if (info.address === null) {
      if (!sobreFirmado(tx) || !esCuenta(tx.source)) return null;
      if (wallet && tx.source !== wallet) return null;
    } else if (esCuenta(info.address)) {
      const firmada = info.signed || (sobreFirmado(tx) && tx.source === info.address);
      if (firmada && wallet && info.address !== wallet) return null;
    }
    const raiz = entrada.rootInvocation.function;
    if (raiz.type !== "sorobanAuthorizedFunctionTypeContractFn") continue;
    if (raiz.contractFn.functionName.toString() !== funcion) continue;
    let contratoAuth: string;
    try {
      contratoAuth = Address.fromScAddress(raiz.contractFn.contractAddress).toString();
    } catch {
      return null;
    }
    if (contratoAuth !== contrato) continue;
    coincidencias += 1;
    if (info.address === null) {
      vistos.add(tx.source);
      continue;
    }
    if (!esCuenta(info.address)) continue;
    const firmada = info.signed || (sobreFirmado(tx) && tx.source === info.address);
    if (!firmada) return null;
    if (wallet && info.address !== wallet) return null;
    vistos.add(info.address);
  }
  if (coincidencias === 0 || vistos.size === 0) return null;
  return [...vistos];
}

function sobreFirmado(tx: Transaction): boolean {
  return tx.signatures.some((firma) => firma.signature.value.length > 0);
}
