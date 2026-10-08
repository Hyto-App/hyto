import { Account, Address, Keypair, Networks, Operation, SorobanDataBuilder, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { FABRICA_MULTI_RELEASE_TESTNET, FUNCION_ALTA_ESCROW } from "./xdr";

export const FIRMANTE_XDR = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(3)).publicKey();
export const CONTRATO_XDR = Address.contract(new Uint8Array(32).fill(7)).toString();

export function xdrDeAlta(
  firmante: string,
  opciones: {
    args?: xdr.ScVal[];
    fee?: string;
    firmaAuth?: Uint8Array;
    footprint?: boolean;
    recurso?: number;
  } = {},
): string {
  return xdrDeInvocacion({
    contrato: FABRICA_MULTI_RELEASE_TESTNET,
    funcion: FUNCION_ALTA_ESCROW,
    firmante,
    ...opciones,
  });
}

export function xdrDeInvocacion(opciones: {
  contrato: string;
  funcion: string;
  firmante: string;
  firmada?: boolean;
  fuente?: string;
  extras?: { contrato: string; funcion: string; firmante: string }[];
  args?: xdr.ScVal[];
  fee?: string;
  firmaAuth?: Uint8Array;
  footprint?: boolean;
  recurso?: number;
}): string {
  const fuente = Keypair.random();
  const firmante = opciones.firmante;
  const firma =
    opciones.firmada === false ? xdr.ScVal.scvVoid() : xdr.ScVal.scvBytes(opciones.firmaAuth ?? new Uint8Array([9, 9, 9]));
  const args = opciones.args ?? [];
  const auth = entradaAuth(opciones.contrato, opciones.funcion, firmante, firma, args);
  const extras = (opciones.extras ?? []).map((extra) => entradaAuth(extra.contrato, extra.funcion, extra.firmante, firma, []));
  let builder = new TransactionBuilder(new Account(fuente.publicKey(), "1"), {
    fee: opciones.fee ?? "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: opciones.contrato,
        function: opciones.funcion,
        args,
        auth: [auth, ...extras],
        source: opciones.fuente,
      }),
    )
    .setTimeout(30);
  if (opciones.recurso !== undefined || opciones.footprint) {
    const datos = new SorobanDataBuilder().setResourceFee(opciones.recurso ?? 100);
    if (opciones.footprint) datos.setFootprint([huellaDeContrato(opciones.contrato)], []);
    builder = builder.setSorobanData(datos.build());
  }
  return builder.build().toXDR();
}

function huellaDeContrato(contrato: string): xdr.LedgerKey {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contrato).toScAddress(),
      key: xdr.ScVal.scvSymbol("Escrow"),
      durability: xdr.ContractDataDurability.persistent,
    }),
  );
}

function entradaAuth(
  contrato: string,
  funcion: string,
  firmante: string,
  firma: xdr.ScVal,
  args: xdr.ScVal[],
): xdr.SorobanAuthorizationEntry {
  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(firmante).toScAddress(),
        nonce: 1n,
        signatureExpirationLedger: 1000,
        signature: firma,
      }),
    ),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: new Address(contrato).toScAddress(),
          functionName: funcion,
          args,
        }),
      ),
      subInvocations: [],
    }),
  });
}
