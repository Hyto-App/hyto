import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { act } from "react";
import { ListaEventos } from "../../components/admin/ListaEventos";
import { Bienvenida } from "../../components/sesion/Bienvenida";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function bienvenida(): HTMLElement | null {
  return document.querySelector(".hyto-welcome");
}

function enlaces(): HTMLAnchorElement[] {
  return [...(bienvenida()?.querySelectorAll("a") ?? [])];
}

async function esperar(): Promise<void> {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 0));
    await Promise.resolve();
  });
}

function conFetch(proyectos: unknown[], usdcListo = false): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/usdc")) return json({ listo: usdcListo });
    if (url.includes("/api/proyectos")) return json({ proyectos });
    return json({}, 404);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function enDemo(rol: "organizador" | "voluntario", hijo: ReactNode): ReactNode {
  return createElement(ProveedorModoDemo, { activo: true, rol, children: hijo });
}

test("la bienvenida dice qué es Hyto y ofrece un solo paso", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(Bienvenida, { paso: { tipo: "unirse", puedeCrear: false } }));
    assert.match(texto(), /Welcome to Hyto/);
    assert.match(texto(), /Hyto pays for event tasks when there is evidence: you upload the evidence and the invoice, Mile reviews them, and a person approves the payment\./);
    assert.deepEqual(
      enlaces().map((enlace) => [enlace.getAttribute("href"), enlace.textContent]),
      [["/join", "Join with a code"]],
    );
    assert.match(enlaces()[0]?.className ?? "", /\bhyto-btn\b/);

    await montar(createElement(Bienvenida, { paso: { tipo: "unirse", puedeCrear: true } }));
    assert.deepEqual(
      enlaces().map((enlace) => enlace.getAttribute("href")),
      ["/join", "/eventos/nuevo"],
    );
    assert.match(enlaces()[1]?.className ?? "", /hyto-btn-line/);

    await montar(createElement(Bienvenida, { paso: { tipo: "abrir", href: "/eventos/zeek", nombre: "ZEEK" } }));
    assert.deepEqual(
      enlaces().map((enlace) => [enlace.getAttribute("href"), enlace.textContent]),
      [["/eventos/zeek", "Open ZEEK"]],
    );
    assert.doesNotMatch(texto(), /Demo/);
    assert.equal(document.querySelector(".hyto-red-etiqueta")?.textContent, "Testnet");
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("en demo la bienvenida ofrece empezar y no dice que no puede cobrar", async () => {
  limpiarPantalla();
  try {
    await montar(enDemo("voluntario", createElement(Bienvenida, { paso: { tipo: "demo", href: "/mis-tareas" } })));
    assert.match(texto(), /Welcome to Hyto/);
    assert.match(texto(), /Demo: practice payment, no real money moves\./);
    assert.deepEqual(
      enlaces().map((enlace) => [enlace.getAttribute("href"), enlace.textContent]),
      [["/mis-tareas", "Start the demo"]],
    );
    assert.equal(document.querySelector(".hyto-red-etiqueta")?.textContent, "Testnet demo");
    // Only the small label names the test network; the rest of the card does not.
    assert.doesNotMatch(texto().replace("Testnet demo", ""), /can't set up payouts|Get ready to be paid|wallet|testnet|network/i);

    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: enDemo("voluntario", createElement(Bienvenida, { paso: { tipo: "demo", href: "/mis-tareas" } })),
      }),
    );
    assert.match(texto(), /Bienvenido a Hyto/);
    assert.match(texto(), /Demo: pago de práctica, no se mueve dinero real\./);
    assert.match(texto(), /Empezar el demo/);
    assert.equal(document.querySelector(".hyto-red-etiqueta")?.textContent, "Demo en testnet");
    assert.doesNotMatch(texto().replace("Demo en testnet", ""), /es c[oó]mo|no puede preparar cobros|billetera|testnet|red de prueba/i);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("eventos sin eventos: unirse con código, sin repetir el paso, y se puede ocultar", async () => {
  limpiarPantalla();
  const restaurar = conFetch([]);
  try {
    await montar(createElement(ListaEventos));
    await esperar();
    assert.match(texto(), /Welcome to Hyto/);
    assert.deepEqual(
      enlaces().map((enlace) => enlace.getAttribute("href")),
      ["/join"],
    );
    assert.match(texto(), /No events yet/);
    assert.equal(document.querySelector(".hyto-estado-vacio a"), null);
    assert.equal(document.querySelector("header .hyto-btn"), null);
    // Get ready to be paid stays on Events, outside the welcome card.
    assert.equal(bienvenida()?.textContent?.includes("Get ready to be paid"), false);
    assert.match(texto(), /Before your first payment/);
    assert.match(texto(), /Get ready to be paid/);

    await pulsar("Hide");
    assert.equal(bienvenida(), null);
    assert.equal(window.localStorage.getItem("hyto-bienvenida-oculta"), "1");
    const acciones = [...document.querySelectorAll(".hyto-estado-vacio a")];
    assert.deepEqual(
      acciones.map((enlace) => enlace.getAttribute("href")),
      ["/join"],
    );

    await montar(createElement(ListaEventos));
    await esperar();
    assert.equal(bienvenida(), null);
    const cuenta = readFileSync(new URL("../../app/(integrante)/cuentas/page.tsx", import.meta.url), "utf8");
    assert.equal(cuenta.includes("PrepararUsdc"), false);
  } finally {
    restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("eventos con un evento abre ese evento, y el cobro listo no aparece", async () => {
  limpiarPantalla();
  const restaurar = conFetch(
    [
      { id: "zeek", nombre: "ZEEK", rol: "volunteer", pendientes: 0 },
      { id: "feria", nombre: "Feria", rol: "volunteer", pendientes: 2 },
    ],
    true,
  );
  try {
    await montar(createElement(ListaEventos));
    await esperar();
    assert.deepEqual(
      enlaces().map((enlace) => [enlace.getAttribute("href"), enlace.textContent]),
      [["/eventos/feria", "Open Feria"]],
    );
    assert.equal(document.querySelector('[aria-labelledby="hyto-cobro-title"]')?.hasAttribute("hidden"), true);
  } finally {
    restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("eventos en demo: empezar el demo, sin preparar el cobro", async () => {
  limpiarPantalla();
  const restaurar = conFetch([{ id: "zeek", nombre: "ZEEK", rol: "organizer", pendientes: 1 }]);
  try {
    await montar(enDemo("organizador", createElement(ListaEventos)));
    await esperar();
    assert.deepEqual(
      enlaces().map((enlace) => [enlace.getAttribute("href"), enlace.textContent]),
      [["/eventos/zeek", "Start the demo"]],
    );
    assert.match(texto(), /Demo: practice payment, no real money moves\./);
    assert.doesNotMatch(texto(), /Get ready to be paid|can't set up payouts/);

    await montar(enDemo("voluntario", createElement(ListaEventos)));
    await esperar();
    assert.equal(enlaces()[0]?.getAttribute("href"), "/mis-tareas");
  } finally {
    restaurar();
    await desmontar();
    limpiarPantalla();
  }
});
