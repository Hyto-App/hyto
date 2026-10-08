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
    assert.match(texto(), /Your Hyto balance: —/);
    assert.match(texto(), /Sign in to see your Hyto balance/);
    assert.match(texto(), /How you get your money/);
    assert.match(texto(), /practice money/);
    assert.match(texto(), /Your sign-in is saved only on this device/);
    assert.doesNotMatch(texto(), /account key lives only in this browser/);
    const avanzado = document.querySelector("details");
    assert.ok(avanzado);
    assert.equal(avanzado.hasAttribute("open"), false);
    assert.match(avanzado.textContent ?? "", /Stellar Passport/);
    assert.match(avanzado.textContent ?? "", /participation and achievements in the Stellar ecosystem/);
    const pasaporte = avanzado.querySelector("a[href='https://demo.stellarpassport.xyz/auth/signup']");
    assert.equal(pasaporte?.textContent, "Open Stellar Passport");
    assert.equal(pasaporte?.getAttribute("target"), "_blank");
    assert.equal(pasaporte?.getAttribute("rel"), "noreferrer");
    const visible = texto().replace(avanzado.textContent ?? "", "");
    assert.doesNotMatch(visible, /Stellar Passport|explorer|account key|USDC/);
    assert.match(texto(), /US\$0/);
    assert.equal(texto().includes("Demo sample"), false);
    assert.equal(document.querySelectorAll(".hyto-logro.is-on").length, 0);
    assert.equal(document.querySelectorAll(".hyto-logro").length, 6);
  } finally {
    globalThis.fetch = original;
    await desmontar();
  }
});

test("una wallet ausente pide Get ready to be paid", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    responder({
      demo: false,
      muestra: false,
      email: "ana@hyto.test",
      wallet: WALLET,
      walletMuestra: false,
      saldo: null,
      saldoEstado: "ausente",
      orgullo: armarOrgullo([]),
    })) as typeof fetch;
  try {
    await montar(createElement(PanelCuenta));
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /cannot receive a payment yet/);
    assert.match(texto(), /Get ready to be paid/);
    const avanzado = document.querySelector("details");
    assert.equal(avanzado?.hasAttribute("open"), false);
    assert.match(avanzado?.textContent ?? "", /Payment account ID \(for support\)/);
    assert.match(avanzado?.textContent ?? "", new RegExp(WALLET.slice(0, 6)));
    const visible = texto().replace(avanzado?.textContent ?? "", "");
    assert.doesNotMatch(visible, new RegExp(WALLET.slice(0, 6)));
    assert.doesNotMatch(visible, /explorer|Stellar Passport|USDC/);
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
    assert.match(texto(), /Your Hyto balance: US\$18\.50/);
    assert.match(texto(), /Available now/);
    const avanzado = document.querySelector("details");
    assert.equal(avanzado?.hasAttribute("open"), false);
    const enlace = avanzado?.querySelector("a[href*='stellar.expert/explorer/testnet/account/']");
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
