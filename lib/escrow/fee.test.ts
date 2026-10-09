import assert from "node:assert/strict";
import test from "node:test";
import { Address, Keypair, xdr } from "@stellar/stellar-sdk";
import { USDC } from "@/lib/integrante/identidades";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeInvocacion } from "./prueba-xdr";
import {
  AVISO_FEE_AUSENTE,
  AVISO_FEE_DISTINTA,
  AVISO_FEE_HORIZON,
  AVISO_FEE_SIN_TRUSTLINE,
  CODIGO_FEE_DISTINTA,
  CODIGO_FEE_HORIZON,
  CODIGO_FEE_SIN_CONFIG,
  CODIGO_FEE_SIN_TRUSTLINE,
  configFee,
  falloSiFeeCliente,
  falloSiFeeDeXdr,
  falloSiTrustlineFee,
} from "./fee";
import { direccionFeeDeLiberacion } from "./xdr";

const FEE = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(11)).publicKey();
const OTRA = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(12)).publicKey();
const CON_USDC = [{ asset_code: "USDC", asset_issuer: USDC.issuer, balance: "0" }];

function liberacion(fee: string): string {
  return xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "release_funds",
    firmante: FIRMANTE_XDR,
    args: [new Address(FIRMANTE_XDR).toScVal(), new Address(fee).toScVal(), xdr.ScVal.scvVec([xdr.ScVal.scvU32(0)])],
  });
}

function esFallo(valor: { direccion: string } | { aviso: string; codigo: string }): valor is { aviso: string; codigo: string } {
  return "aviso" in valor;
}

test("la dirección de fee sale solo del servidor", () => {
  const vacio = configFee({});
  assert.equal(esFallo(vacio), true);
  if (!esFallo(vacio)) return;
  assert.equal(vacio.aviso, AVISO_FEE_AUSENTE);
  const blanco = configFee({ HYTO_TRUSTLESS_FEE: "  " });
  const invalida = configFee({ HYTO_TRUSTLESS_FEE: "no-es-cuenta" });
  assert.equal(esFallo(blanco) && blanco.codigo, CODIGO_FEE_SIN_CONFIG);
  assert.equal(esFallo(invalida) && invalida.codigo, CODIGO_FEE_SIN_CONFIG);
  assert.deepEqual(configFee({ HYTO_TRUSTLESS_FEE: `  ${FEE}  ` }), { direccion: FEE });
});

test("una liberación con otra dirección de fee se rechaza, y la del servidor pasa", () => {
  const valida = liberacion(FEE);
  const ajena = liberacion(OTRA);
  assert.equal(direccionFeeDeLiberacion(valida), FEE);
  assert.equal(direccionFeeDeLiberacion(ajena), OTRA);
  assert.equal(falloSiFeeDeXdr(valida, { HYTO_TRUSTLESS_FEE: FEE }), null);
  const rechazo = falloSiFeeDeXdr(ajena, { HYTO_TRUSTLESS_FEE: FEE });
  assert.equal(rechazo?.codigo, CODIGO_FEE_DISTINTA);
  assert.equal(rechazo?.aviso, AVISO_FEE_DISTINTA);
  assert.equal(falloSiFeeDeXdr(ajena, {})?.codigo, CODIGO_FEE_SIN_CONFIG);
  assert.equal(falloSiFeeDeXdr("AAAA", { HYTO_TRUSTLESS_FEE: FEE }), null);
  const otraForma = xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "release_funds",
    firmante: FIRMANTE_XDR,
    args: [xdr.ScVal.scvU32(1), new Address(OTRA).toScVal()],
  });
  assert.equal(direccionFeeDeLiberacion(otraForma), null);
  const noEsLiberacion = xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "approve_milestones",
    firmante: FIRMANTE_XDR,
    args: [new Address(FIRMANTE_XDR).toScVal(), new Address(OTRA).toScVal()],
  });
  assert.equal(falloSiFeeDeXdr(noEsLiberacion, { HYTO_TRUSTLESS_FEE: FEE }), null);
});

test("el cuerpo del cliente no elige la cuenta de la comisión", () => {
  assert.equal(falloSiFeeCliente({ accion: "liberar" }, FEE), null);
  assert.equal(falloSiFeeCliente({ trustlessWorkAddress: FEE }, FEE), null);
  assert.equal(falloSiFeeCliente({ direccionFee: "" }, FEE), null);
  assert.equal(falloSiFeeCliente({ trustlessWorkAddress: OTRA }, FEE)?.codigo, CODIGO_FEE_DISTINTA);
  assert.equal(falloSiFeeCliente({ feeAddress: OTRA, trustless_work_address: FEE }, FEE)?.codigo, CODIGO_FEE_DISTINTA);
  assert.equal(falloSiFeeCliente({ feeAddress: 12 }, FEE)?.codigo, CODIGO_FEE_DISTINTA);
});

test("la trustline de USDC de la cuenta de fee se lee en Horizon testnet", async () => {
  const vistas: string[] = [];
  const fetchOk: typeof fetch = async (input) => {
    vistas.push(String(input));
    return Response.json({ balances: CON_USDC });
  };
  assert.equal(await falloSiTrustlineFee(FEE, fetchOk), null);
  assert.match(vistas[0] ?? "", /^https:\/\/horizon-testnet\.stellar\.org\/accounts\//);
  assert.equal(vistas[0]?.includes("horizon.stellar.org"), false);

  const sinLinea: typeof fetch = async () => Response.json({ balances: [{ asset_code: "USDC", asset_issuer: "GOTROEMISOR" }] });
  const falta = await falloSiTrustlineFee(FEE, sinLinea);
  assert.equal(falta?.codigo, CODIGO_FEE_SIN_TRUSTLINE);
  assert.equal(falta?.aviso, AVISO_FEE_SIN_TRUSTLINE);
  assert.match(falta?.aviso ?? "", /error 13/);

  const ausente: typeof fetch = async () => new Response("missing", { status: 404 });
  assert.equal((await falloSiTrustlineFee(FEE, ausente))?.codigo, CODIGO_FEE_SIN_TRUSTLINE);

  const caido: typeof fetch = async () => new Response("no", { status: 500 });
  const red = await falloSiTrustlineFee(FEE, caido);
  assert.equal(red?.codigo, CODIGO_FEE_HORIZON);
  assert.equal(red?.estado, 503);
  assert.equal(red?.aviso, AVISO_FEE_HORIZON);

  const corta: typeof fetch = async () => {
    throw new Error("red");
  };
  assert.equal((await falloSiTrustlineFee(FEE, corta))?.codigo, CODIGO_FEE_HORIZON);
});
