import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { PanelCuenta } from "../../components/integrante/PanelCuenta";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import { armarOrgullo } from "./orgullo";

const WALLET = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

async function asentar(): Promise<void> {
  for (let paso = 0; paso < 4; paso += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

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
    await asentar();
    assert.match(texto(), /Paid tasks will show up here/);
    assert.match(texto(), /Nothing paid yet/);
    assert.match(texto(), /Your Hyto balance: —/);
    assert.match(texto(), /cannot receive a payment yet/);
    const preparar = [...document.querySelectorAll("button")].find((boton) => boton.textContent?.includes("Get ready to be paid"));
    assert.ok(preparar instanceof HTMLButtonElement);
    assert.equal(preparar.disabled, false);
    assert.equal(texto().includes("Open Events and tap Get ready to be paid"), false);
    assert.match(texto(), /How to receive your money/);
    assert.match(texto(), /practice money/);
    assert.match(texto(), /What does it cost to pay a task\?/);
    assert.match(texto(), /The payment processor charges a 0\.3% fee/);
    assert.match(texto(), /US\$1\.99 \(US\$2 minus a US\$0\.01 fee\)/);
    assert.match(texto(), /US\$12\.44 \(US\$12\.48 minus a US\$0\.04 fee\)/);
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

test("quien organiza sin pagos propios no ve ganancias, hitos ni racha", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    responder({
      demo: false,
      organiza: true,
      muestra: false,
      email: "org@hyto.test",
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
    assert.doesNotMatch(texto(), /Earned from events/);
    assert.doesNotMatch(texto(), /Milestones released/);
    assert.doesNotMatch(texto(), /Streak/);
    assert.doesNotMatch(texto(), /Earnings by month/);
    assert.doesNotMatch(texto(), /Three-month streak/);
    assert.match(texto(), /Your Hyto balance/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
  }
});

test("configuración en español muestra el costo y la llave en tuteo", async () => {
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
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(PanelCuenta) }));
    await asentar();
    assert.match(texto(), /¿Cuánto cuesta pagar una tarea\?/);
    assert.match(texto(), /comisión del 0,3 %/);
    assert.match(texto(), /US\$1,99 \(US\$2 menos comisión de US\$0,01\)/);
    assert.match(texto(), /US\$12,44 \(US\$12,48 menos comisión de US\$0,04\)/);
    assert.match(texto(), /Agregue una llave de acceso para no perder su cuenta/);
    assert.match(texto(), /Usar un teléfono o una tablet/);
    assert.doesNotMatch(texto(), /Agregá|Use a phone or tablet|Create passkey|Use passkey|\bpasskey\b/i);
  } finally {
    globalThis.fetch = original;
    await desmontar();
  }
});

test("si la cuenta no carga, el costo de pagar sigue en la página", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  globalThis.fetch = (async () => responder({ aviso: "We couldn't load your account." }, 500)) as typeof fetch;
  try {
    await montar(createElement(PanelCuenta));
    await asentar();
    assert.match(texto(), /We couldn't load your account/);
    assert.match(texto(), /What does it cost to pay a task\?/);
    assert.match(texto(), /0\.3% fee/);
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
    await asentar();
    assert.match(texto(), /cannot receive a payment yet/);
    const preparar = [...document.querySelectorAll("button")].find((boton) => boton.textContent?.includes("Get ready to be paid"));
    assert.ok(preparar instanceof HTMLButtonElement);
    assert.equal(preparar.disabled, false);
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
    assert.equal(
      [...document.querySelectorAll("button")].some((boton) => boton.textContent?.includes("Get ready to be paid")),
      false,
    );
    const avanzado = document.querySelector("details");
    assert.equal(avanzado?.hasAttribute("open"), false);
    const enlace = avanzado?.querySelector("a[href*='stellar.expert/explorer/testnet/account/']");
    assert.equal(enlace?.getAttribute("href"), `https://stellar.expert/explorer/testnet/account/${encodeURIComponent(WALLET)}`);
    assert.equal(enlace?.getAttribute("target"), "_blank");
    assert.equal(enlace?.getAttribute("rel"), "noopener noreferrer");
    await pulsar("Copy address");
    assert.equal(copiado, WALLET);
    assert.match(texto(), /Copied/);
    assert.equal(texto().toLowerCase().includes("secret"), false);
  } finally {
    globalThis.fetch = original;
    await desmontar();
  }
});

test("el panel muestra el neto recibido al lado del saldo, no el monto apartado", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  const orgullo = armarOrgullo(
    [
      {
        id: "pago",
        titulo: "Booth",
        proyectoId: "zeek",
        proyecto: "ZEEK",
        pagada: true,
        monto: "1.994",
        pagadoEn: "2026-10-02T18:00:00.000Z",
      },
      {
        id: "comida",
        titulo: "Meal",
        proyectoId: "zeek",
        proyecto: "ZEEK",
        pagada: true,
        monto: "12.44256",
        pagadoEn: "2026-10-03T18:00:00.000Z",
      },
    ],
    new Date("2026-10-15T18:00:00.000Z"),
  );
  globalThis.fetch = (async () =>
    responder({
      demo: false,
      muestra: false,
      email: "ana@hyto.test",
      wallet: WALLET,
      walletMuestra: false,
      saldo: "14.43656",
      saldoEstado: "ok",
      orgullo,
    })) as typeof fetch;
  try {
    await montar(createElement(PanelCuenta));
    await asentar();
    assert.match(texto(), /Your Hyto balance: US\$14\.43656/);
    assert.deepEqual(
      [...document.querySelectorAll(".hyto-kpis .hyto-amount")].map((nodo) => nodo.textContent),
      ["US$14.43", "US$0", "US$14.43"],
    );
    assert.match(texto(), /All time/);
    assert.match(texto(), /US\$1\.99 \(US\$2 minus a US\$0\.01 fee\)/);
    assert.match(texto(), /US\$12\.44 \(US\$12\.48 minus a US\$0\.04 fee\)/);
    assert.equal(texto().includes("US$1.994"), false);
    assert.equal(texto().includes("US$12.44256"), false);
    assert.equal(texto().includes("US$14.48"), false);
    assert.equal(
      [...document.querySelectorAll("button")].some((boton) => boton.textContent?.includes("Get ready to be paid")),
      false,
    );
  } finally {
    globalThis.fetch = original;
    await desmontar();
  }
});
