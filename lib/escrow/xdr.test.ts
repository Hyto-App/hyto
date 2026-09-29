import assert from "node:assert/strict";
import test from "node:test";
import { Address } from "@stellar/stellar-sdk";
import { CONTRATO_XDR, FIRMANTE_XDR, xdrDeInvocacion } from "./prueba-xdr";
import { leerInvocacion } from "./xdr";

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
  assert.deepEqual(leerInvocacion(xdr), { contrato: CONTRATO_XDR, funcion: "fund_escrow", firmantes: [FIRMANTE_XDR] });
});
