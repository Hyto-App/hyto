import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_COBRO_SIN_CONFIRMAR } from "@/lib/integrante/avisosUsdc";
import { texto } from "@/lib/ui/diccionario";
import { AVISO_ALTA_PERSONA, AVISO_ALTA_SIN_CONFIRMAR, claveAvisoAlta } from "./avisoAlta";

test("un aviso de trustline en el alta es para quien acaba de entrar, no para quien organiza", () => {
  assert.equal(claveAvisoAlta("We couldn't add the USDC trustline on Stellar testnet."), "entrar.altaPendiente");
  assert.equal(claveAvisoAlta("ESCROW_RECEIVER_TRUSTLINE_MISSING"), "entrar.altaPendiente");
  assert.equal(texto("en", "entrar.altaPendiente"), AVISO_ALTA_PERSONA);
  assert.doesNotMatch(texto("en", "entrar.altaPendiente"), /person who gets paid/i);
  assert.match(texto("es", "entrar.altaPendiente"), /Abre Eventos/);
});

test("sin permiso de firma el alta no pide volver a entrar", () => {
  assert.equal(claveAvisoAlta(AVISO_COBRO_SIN_CONFIRMAR), "entrar.altaSinConfirmar");
  assert.equal(claveAvisoAlta(AVISO_ALTA_SIN_CONFIRMAR), "entrar.altaSinConfirmar");
  assert.doesNotMatch(texto("en", "entrar.altaSinConfirmar"), /Sign in again/i);
  assert.match(texto("es", "entrar.altaSinConfirmar"), /Ya entraste/);
});

test("un fallo de Friendbot conserva su aviso", () => {
  assert.equal(claveAvisoAlta("Friendbot couldn't fund this testnet account. Try again."), null);
});
