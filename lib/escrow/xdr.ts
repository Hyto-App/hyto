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
export function leerInvocacion(crudo: string): InvocacionFirmada | null {
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
  const firmantes = firmantesDe(tx, op.auth ?? [], funcion, contrato);
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
): string[] | null {
  if (auth.length === 0) {
    return sobreFirmado(tx) && esCuenta(tx.source) ? [tx.source] : null;
  }
  const vistos = new Set<string>();
  let coincidencias = 0;
  for (const entrada of auth) {
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
    const info = inspectAuthEntry(entrada);
    // La cuenta que autoriza el invoke es la de la credencial (address) o,
    // si la credencial es la cuenta origen, tx.source. No usamos una clave
    // interna distinta ni el fee-payer cuando la credencial nombra otra G.
    if (info.address === null) {
      if (!sobreFirmado(tx) || !esCuenta(tx.source)) return null;
      vistos.add(tx.source);
      continue;
    }
    if (!esCuenta(info.address)) continue;
    const firmada = info.signed || (sobreFirmado(tx) && tx.source === info.address);
    if (!firmada) return null;
    vistos.add(info.address);
  }
  if (coincidencias === 0 || vistos.size === 0) return null;
  return [...vistos];
}

function sobreFirmado(tx: Transaction): boolean {
  return tx.signatures.some((firma) => firma.signature.value.length > 0);
}
