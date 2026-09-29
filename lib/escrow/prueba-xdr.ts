import { Account, Address, Keypair, Networks, Operation, TransactionBuilder, xdr } from "@stellar/stellar-sdk";

export const FIRMANTE_XDR = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(3)).publicKey();
export const CONTRATO_XDR = Address.contract(new Uint8Array(32).fill(7)).toString();

export function xdrDeInvocacion(opciones: {
  contrato: string;
  funcion: string;
  firmante: string;
  firmada?: boolean;
  fuente?: string;
  extras?: { contrato: string; funcion: string; firmante: string }[];
}): string {
  const fuente = Keypair.random();
  const firmante = opciones.firmante;
  const firma = opciones.firmada === false ? xdr.ScVal.scvVoid() : xdr.ScVal.scvBytes(new Uint8Array([9, 9, 9]));
  const auth = entradaAuth(opciones.contrato, opciones.funcion, firmante, firma);
  const extras = (opciones.extras ?? []).map((extra) => entradaAuth(extra.contrato, extra.funcion, extra.firmante, firma));
  const tx = new TransactionBuilder(new Account(fuente.publicKey(), "1"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: opciones.contrato,
        function: opciones.funcion,
        args: [],
        auth: [auth, ...extras],
        source: opciones.fuente,
      }),
    )
    .setTimeout(30)
    .build();
  return tx.toXDR();
}

function entradaAuth(contrato: string, funcion: string, firmante: string, firma: xdr.ScVal): xdr.SorobanAuthorizationEntry {
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
          args: [],
        }),
      ),
      subInvocations: [],
    }),
  });
}
