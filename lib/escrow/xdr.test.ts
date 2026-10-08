import assert from "node:assert/strict";
import test from "node:test";
import { Address, Keypair, xdr } from "@stellar/stellar-sdk";
import { esContrato } from "./cuerpos";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeAlta, xdrDeInvocacion } from "./prueba-xdr";
import { FABRICA_MULTI_RELEASE_TESTNET, FUNCION_ALTA_ESCROW, anclaDeXdr, esAltaDeFabrica, leerInvocacion } from "./xdr";

test("la invocación firmada trae la función y la cuenta, no el rótulo", () => {
  const xdr = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "resolve_dispute", firmante: FIRMANTE_XDR });
  assert.deepEqual(leerInvocacion(xdr), { contrato: CONTRATO_XDR, funcion: "resolve_dispute", firmantes: [FIRMANTE_XDR] });
  assert.equal(leerInvocacion("AAAA"), null);
  const sinFirma = xdrDeInvocacion({ contrato: CONTRATO_XDR, funcion: "resolve_dispute", firmante: FIRMANTE_XDR, firmada: false });
  assert.equal(leerInvocacion(sinFirma), null);
});

test("una autorización de otro contrato no cambia al firmante de la llamada", () => {
  const otro = Address.contract(new Uint8Array(32).fill(9)).toString();
  const xdr = xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "fund_escrow",
    firmante: FIRMANTE_XDR,
    extras: [{ contrato: otro, funcion: "transfer", firmante: FIRMANTE_XDR }],
  });
  assert.deepEqual(leerInvocacion(xdr, FIRMANTE_XDR), {
    contrato: CONTRATO_XDR,
    funcion: "fund_escrow",
    firmantes: [FIRMANTE_XDR],
  });
});

test("una G distinta de la sesión no puede autorizar ni otro contrato", () => {
  const otroContrato = Address.contract(new Uint8Array(32).fill(9)).toString();
  const otraCuenta = Keypair.random().publicKey();
  const xdr = xdrDeInvocacion({
    contrato: CONTRATO_XDR,
    funcion: "fund_escrow",
    firmante: FIRMANTE_XDR,
    extras: [{ contrato: otroContrato, funcion: "transfer", firmante: otraCuenta }],
  });
  assert.equal(leerInvocacion(xdr, FIRMANTE_XDR), null);
});

test("el ancla ata contrato, función y argumentos, y no el fee ni el footprint ni la auth", () => {
  assert.equal(esContrato(FABRICA_MULTI_RELEASE_TESTNET), true);
  const args = [xdr.ScVal.scvI128(new xdr.Int128Parts({ hi: 0n, lo: 20n })), new Address(FIRMANTE_XDR).toScVal()];
  const base = xdrDeAlta(FIRMANTE_XDR, { args });
  const otraVez = xdrDeAlta(FIRMANTE_XDR, { args, fee: "8000", firmaAuth: new Uint8Array([4, 5, 6]), footprint: true, recurso: 900 });
  assert.equal(anclaDeXdr(base), anclaDeXdr(otraVez));
  assert.notEqual(base, otraVez);
  assert.equal(esAltaDeFabrica(leerInvocacion(otraVez, FIRMANTE_XDR) ?? { contrato: "", funcion: "" }), true);
  const otroMonto = xdrDeAlta(FIRMANTE_XDR, {
    args: [xdr.ScVal.scvI128(new xdr.Int128Parts({ hi: 0n, lo: 21n })), new Address(FIRMANTE_XDR).toScVal()],
  });
  assert.notEqual(anclaDeXdr(base), anclaDeXdr(otroMonto));
  const otraFuncion = xdrDeInvocacion({ contrato: FABRICA_MULTI_RELEASE_TESTNET, funcion: "fund_escrow", firmante: FIRMANTE_XDR, args });
  assert.equal(esAltaDeFabrica({ contrato: FABRICA_MULTI_RELEASE_TESTNET, funcion: "fund_escrow" }), false);
  assert.notEqual(anclaDeXdr(base), anclaDeXdr(otraFuncion));
  assert.equal(anclaDeXdr("AAAA"), null);
  assert.equal(FUNCION_ALTA_ESCROW, "tw_new_multi_release_escrow");
});
