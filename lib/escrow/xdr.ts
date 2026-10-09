import { createHash } from "node:crypto";
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

// Factory de multi-release v2 en Stellar testnet. El alta llama
// tw_new_multi_release_escrow aquí; la dirección prevista del escrow no es este contrato.
export const FABRICA_MULTI_RELEASE_TESTNET = "CDRCUUCXNNUWYEYWSDM7DJTAKPLEVIQXLYG5B7RIJCB6GFAGSENTKVG7";
export const FUNCION_ALTA_ESCROW = "tw_new_multi_release_escrow";

export type InvocacionFirmada = {
  contrato: string;
  funcion: string;
  firmantes: string[];
};

export const FUNCION_LIBERACION = "release_funds";

export function esAltaDeFabrica(invocacion: { contrato: string; funcion: string }): boolean {
  return invocacion.funcion === FUNCION_ALTA_ESCROW && invocacion.contrato === FABRICA_MULTI_RELEASE_TESTNET;
}

// release_funds(release_signer, trustless_work_address, ...). The contract pays the
// 0.3% protocol fee to whatever address the releaser passes. Null when this XDR is
// not that call shape, so other argument layouts are left to their own checks.
export function direccionFeeDeLiberacion(crudo: string): string | null {
  const llamada = leerLlamada(crudo);
  if (!llamada || llamada.funcion !== FUNCION_LIBERACION || llamada.args.length < 2) return null;
  const firmante = direccionScVal(llamada.args[0]);
  const fee = direccionScVal(llamada.args[1]);
  if (!firmante || !esCuenta(firmante) || !fee) return null;
  return fee;
}

// El rótulo del cuerpo no dice quién firma. Esta lectura sale del XDR:
// la función del invoke y las cuentas con firma en la autorización Soroban.
// No verifica la firma contra la clave: la red lo hace al aceptar la transacción.
// Si el cliente solo pegó la G… en la sesión, no puede fabricar esta autorización.
export function leerInvocacion(crudo: string, wallet: string | null = null): InvocacionFirmada | null {
  const llamada = leerLlamada(crudo);
  if (!llamada) return null;
  const firmantes = firmantesDe(llamada.tx, llamada.auth, llamada.funcion, llamada.contrato, wallet);
  if (!firmantes || firmantes.length === 0) return null;
  return { contrato: llamada.contrato, funcion: llamada.funcion, firmantes };
}

// Huella de contrato, función y argumentos del invoke. No incluye fee, footprint ni auth:
// una re-simulación de Cavos puede cambiar esos tres y la llamada sigue siendo la misma.
export function anclaDeXdr(crudo: string): string | null {
  const llamada = leerLlamada(crudo);
  if (!llamada) return null;
  const hash = createHash("sha256");
  hash.update(llamada.contrato);
  hash.update("\0");
  hash.update(llamada.funcion);
  hash.update("\0");
  for (const arg of llamada.args) {
    hash.update(Buffer.from(arg.toXDR()));
    hash.update("\0");
  }
  return hash.digest("hex");
}

type Llamada = {
  tx: Transaction;
  contrato: string;
  funcion: string;
  args: xdr.ScVal[];
  auth: xdr.SorobanAuthorizationEntry[];
};

function leerLlamada(crudo: string): Llamada | null {
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
  const args = Array.isArray(llamada.args) ? llamada.args : [];
  return { tx, contrato, funcion, args, auth: op.auth ?? [] };
}

function direccionScVal(valor: xdr.ScVal): string | null {
  try {
    return Address.fromScVal(valor).toString();
  } catch {
    return null;
  }
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
