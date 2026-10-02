import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { PanelCuenta } from "../../components/integrante/PanelCuenta";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import { armarOrgullo } from "./orgullo";

const WALLET = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function responder(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("el panel vacío muestra ceros, el gráfico en blanco y las insignias cerradas", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    responder({
      demo: false,
      muestra: false,
      email: "ana@hyto.test",
      wallet: null,
      walletMuestra: false,
      saldo: null,
      saldoEstado: "sin-wallet",
      orgullo: armarOrgullo([]),
    })) as typeof fetch;
  try {
    await montar(createElement(PanelCuenta));
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /Paid tasks will show up here/);
    assert.match(texto(), /Nothing paid yet/);
    assert.match(texto(), /Add a wallet to see testnet USDC/);
    assert.match(texto(), /US\$0/);
    assert.equal(texto().includes("Demo sample"), false);
    assert.equal(document.querySelectorAll(".hyto-badge.is-on").length, 0);
    assert.equal(document.querySelectorAll(".hyto-badge").length, 6);
  } finally {
    globalThis.fetch = original;
    await desmontar();
  }
});

test("copiar la dirección pública confirma en el botón", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  let copiado = "";
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (valor: string) => {
        copiado = valor;
      },
    },
  });
  globalThis.fetch = (async () =>
    responder({
      demo: false,
      muestra: false,
      email: "ana@hyto.test",
      wallet: WALLET,
      walletMuestra: false,
      saldo: "18.5",
      saldoEstado: "ok",
      orgullo: armarOrgullo([]),
    })) as typeof fetch;
  try {
    await montar(createElement(PanelCuenta));
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /US\$18\.50/);
    const enlace = document.querySelector("a[href*='stellar.expert/explorer/testnet/account/']");
    assert.equal(enlace?.getAttribute("href"), `https://stellar.expert/explorer/testnet/account/${encodeURIComponent(WALLET)}`);
    await pulsar("Copy address");
    assert.equal(copiado, WALLET);
    assert.match(texto(), /Copied/);
    assert.equal(texto().toLowerCase().includes("secret"), false);
  } finally {
    globalThis.fetch = original;
    await desmontar();
  }
});
