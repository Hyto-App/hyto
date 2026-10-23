import assert from "node:assert/strict";
import test from "node:test";
import { Address, Keypair, StrKey, encodeMuxedAccount, encodeMuxedAccountToAddress, encodeMuxedContractAddress, xdr } from "@stellar/stellar-sdk";
import { USDC_SAC_TESTNET } from "./desplegar";
import { avisoRoles, esContrato, esCuenta, pedidoDespliegue } from "./cuerpos";
import { contratoBase, esContratoMuxed, esDestinoStellar } from "./direcciones";
import { configFee, falloSiFeeDeXdr } from "./fee";
import { estadoReceptorUsdc } from "./receptor";
import { tokenDeEscrow } from "./saldo-red";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeInvocacion } from "./prueba-xdr";
import { direccionFeeDeLiberacion, leerInvocacion } from "./xdr";
import type { CuentasDespliegue } from "./tipos";

const CONTRATO = Address.contract(new Uint8Array(32).fill(4)).toString();
const W = encodeMuxedContractAddress(CONTRATO, "7");
const CUENTA = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(5)).publicKey();

function cuentas(receptor: string): CuentasDespliegue {
  return {
    red: "v2",
    firmante: CUENTA,
    organizador: CUENTA,
    receptor,
    proveedor: CUENTA,
    admin: Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(6)).publicKey(),
    plataforma: Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(7)).publicKey(),
    resolutor: Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(8)).publicKey(),
    monto: 20,
    titulo: "Mesa",
    descripcion: "Mesa",
    hito: "Mesa",
    engagementId: "tarea-1",
    trustline: { contractId: USDC_SAC_TESTNET, symbol: "USDC", address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
    comision: 0,
  };
}

test("una W… con checksum es un contrato multiplexado y no una cuenta ni un id de contrato", () => {
  assert.equal(W.startsWith("W"), true);
  assert.equal(esContratoMuxed(W), true);
  assert.equal(esContratoMuxed(`  ${W}  `), true);
  assert.equal(esContratoMuxed(`${W.slice(0, -1)}A`), false);
  assert.equal(esContratoMuxed("W".padEnd(69, "A")), false);
  assert.equal(esCuenta(W), false);
  assert.equal(esContrato(W), false);
  assert.equal(esDestinoStellar(W), true);
  assert.equal(esDestinoStellar(CUENTA), true);
  assert.equal(esDestinoStellar(CONTRATO), true);
  assert.equal(contratoBase(W), CONTRATO);
  assert.equal(contratoBase(CONTRATO), CONTRATO);
  assert.equal(contratoBase(CUENTA), null);
  const muxed = encodeMuxedAccountToAddress(encodeMuxedAccount(CUENTA, "1"));
  assert.equal(muxed.startsWith("M"), true);
  assert.equal(esDestinoStellar(muxed), true);
  assert.equal(esCuenta(muxed), false);
  assert.equal(esContratoMuxed(muxed), false);
});

test("el XDR de Protocol 30 conserva la W… y el brazo del encabezado en milisegundos", () => {
  const sc = new Address(W).toScAddress();
  assert.equal(sc.type, "scAddressTypeMuxedContract");
  const ida = sc.toXDR("base64");
  const vuelta = Address.fromScAddress(xdr.ScAddress.fromXDR(ida, "base64")).toString();
  assert.equal(vuelta, W);
  assert.equal(StrKey.isValidMuxedContract(vuelta), true);
  assert.equal(xdr.StellarValueType.stellarValueSignedMs.value, 3);
  assert.equal(xdr.StellarValueType.stellarValueEmptyTxSetMs.value, 4);
});

test("leer la comisión de una liberación no pierde una W… y no la acepta como cuenta", () => {
  const xdrFee = xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "release_funds",
    firmante: FIRMANTE_XDR,
    args: [new Address(FIRMANTE_XDR).toScVal(), new Address(W).toScVal(), xdr.ScVal.scvVec([xdr.ScVal.scvU32(0)])],
  });
  assert.equal(direccionFeeDeLiberacion(xdrFee), W);
  const config = configFee({ HYTO_TRUSTLESS_FEE: W });
  assert.equal("aviso" in config, true);
  assert.equal(falloSiFeeDeXdr(xdrFee, { HYTO_TRUSTLESS_FEE: CUENTA })?.codigo, "HYTO_FEE_DISTINTA");
});

test("una autorización W… no sustituye a la cuenta que firma", () => {
  const xdrAuth = xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "fund_escrow",
    firmante: FIRMANTE_XDR,
    extras: [{ contrato: CONTRATO, funcion: "transfer", firmante: W }],
  });
  assert.deepEqual(leerInvocacion(xdrAuth, FIRMANTE_XDR), {
    contrato: CONTRATO_XDR,
    funcion: "fund_escrow",
    firmantes: [FIRMANTE_XDR],
  });
  const soloW = xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "fund_escrow",
    firmante: W,
  });
  assert.equal(leerInvocacion(soloW, FIRMANTE_XDR), null);
});

test("el receptor del escrow sigue siendo una cuenta: una W… no se despliega", () => {
  assert.match(String(avisoRoles(cuentas(W))), /not a Stellar account/);
  assert.equal(typeof pedidoDespliegue(cuentas(W)), "string");
  const otro = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(9)).publicKey();
  assert.equal(typeof pedidoDespliegue(cuentas(otro)), "object");
});

test("el token del escrow acepta una W… y usa el contrato base", () => {
  assert.equal(tokenDeEscrow({ trustline: { contractId: W } }), CONTRATO);
  assert.equal(tokenDeEscrow({ trustline: { contractId: CONTRATO } }), CONTRATO);
  assert.equal(tokenDeEscrow({}), USDC_SAC_TESTNET);
});

test("preparar el cobro no consulta Horizon por una W…", async () => {
  let llamadas = 0;
  const estado = await estadoReceptorUsdc(W, async () => {
    llamadas += 1;
    return new Response("no", { status: 500 });
  });
  assert.equal(llamadas, 0);
  assert.equal(estado.listo, false);
  if (!estado.listo) assert.equal(estado.codigo, "receptor_no_listo");
});
