import assert from "node:assert/strict";
import test from "node:test";
import { estadoRecarga, FAUCET_CIRCLE } from "./recarga";

const WALLET = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const BASE = { demo: false, muestra: false, walletMuestra: false, wallet: WALLET, saldoEstado: "ok" as const };

test("el faucet solo se sugiere cuando la cuenta ya puede recibir USDC en testnet", () => {
  assert.equal(FAUCET_CIRCLE, "https://faucet.circle.com");
  assert.equal(estadoRecarga(BASE), "lista");
  assert.equal(estadoRecarga({ ...BASE, red: "testnet" }), "lista");
  assert.equal(estadoRecarga({ ...BASE, saldoEstado: "ausente" }), "preparar");
  assert.equal(estadoRecarga({ ...BASE, saldoEstado: "error" }), "oculta");
  assert.equal(estadoRecarga({ ...BASE, saldoEstado: "sin-wallet", wallet: null }), "oculta");
  assert.equal(estadoRecarga({ ...BASE, wallet: "no-es-cuenta" }), "oculta");
  assert.equal(estadoRecarga({ ...BASE, red: "public" }), "oculta");
  assert.equal(estadoRecarga({ ...BASE, demo: true }), "oculta");
  assert.equal(estadoRecarga({ ...BASE, muestra: true }), "oculta");
  assert.equal(estadoRecarga({ ...BASE, walletMuestra: true }), "oculta");
});
