import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { POLITICA_INACTIVA } from "./enclave";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { CLAVE_INTENCION } from "./intencion";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

const JERGA = /\b(trustline|friendbot|soroban|xdr|wallet|stellar)\b/i;

test("Sign in y Crear cuenta ofrecen Google y correo, sin jerga, en pestañas", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  try {
    await montar(createElement(Entrar));
    await act(async () => {
      await Promise.resolve();
    });
    const inicio = texto();
    assert.match(inicio, /Sign up/);
    assert.match(inicio, /Sign in/);
    assert.match(inicio, /won't create a new account/);

    await pulsar("Sign in");
    const ingreso = texto();
    assert.match(ingreso, /Continue with Google/);
    assert.match(ingreso, /Continue with Apple/);
    assert.match(ingreso, /Continue with email/);
    assert.match(ingreso, /Show the spend,/);
    assert.ok(document.querySelector('input[type="email"]'));
    const pestanas = [...document.querySelectorAll('[role="tab"]')];
    assert.deepEqual(
      pestanas.map((pestana) => [pestana.textContent, pestana.getAttribute("aria-selected")]),
      [
        ["Sign in", "true"],
        ["Create account", "false"],
      ],
    );
    assert.doesNotMatch(ingreso, JERGA);

    await pulsar("Create account");
    const alta = texto();
    assert.equal(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent, "Create account");
    assert.match(alta, /Continue with Google/);
    assert.match(alta, /Continue with Apple/);
    assert.match(alta, /Continue with email/);
    assert.doesNotMatch(alta, JERGA);
    const ids = [...document.querySelectorAll("[id]")].map((nodo) => nodo.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate ids");
  } finally {
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});

test("el código de Sign in viaja con la intención signin y el de Crear cuenta con signup", async () => {
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-prueba";
  const intenciones: string[] = [];
  try {
    for (const [boton, pestana] of [
      ["Sign in", null],
      ["Sign in", "Create account"],
    ] as const) {
      limpiarPantalla();
      await montar(
        createElement(Entrar, {
          crear: async () => ({ sendOtp: async () => undefined }),
          politica: async () => POLITICA_INACTIVA,
          confirmarCodigo: async (_auth, _correo, _codigo, intencion) => {
            intenciones.push(intencion);
            throw new Error('{"error":"invalid_code","message":"Invalid code"}');
          },
          esperaMinima: 0,
        }),
      );
      await pulsar(boton);
      if (pestana) await pulsar(pestana);
      await escribir('input[type="email"]', "ana@example.com");
      await pulsar("Continue with email");
      await escribir('input[autocomplete="one-time-code"]', "123456");
    }
    assert.deepEqual(intenciones, ["signin", "signup"]);
  } finally {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
    await desmontar();
    limpiarPantalla();
  }
});

test("Continue with Google guarda signin en Sign in y signup en Crear cuenta", async () => {
  // No Cavos app id: google() stores the intent, then stops with the config notice before leaving the page.
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  const error = console.error;
  console.error = () => {};
  const intenciones: (string | null)[] = [];
  try {
    for (const pestana of [null, "Create account"] as const) {
      limpiarPantalla();
      window.sessionStorage.clear();
      await montar(createElement(Entrar));
      await pulsar("Sign in");
      if (pestana) await pulsar(pestana);
      await pulsar("Continue with Google");
      intenciones.push(window.sessionStorage.getItem(CLAVE_INTENCION));
      assert.match(document.querySelector('[role="status"]')?.textContent ?? "", /isn't set up yet/);
    }
    assert.deepEqual(intenciones, ["signin", "signup"]);
  } finally {
    console.error = error;
    if (previo !== undefined) process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
    window.sessionStorage.clear();
    await desmontar();
    limpiarPantalla();
  }
});

test("Continue with Apple guarda signin en Sign in y signup en Crear cuenta", async () => {
  // Same path as Google: the intent is stored first, then the missing app id stops it before leaving the page.
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  const error = console.error;
  console.error = () => {};
  const intenciones: (string | null)[] = [];
  try {
    for (const pestana of [null, "Create account"] as const) {
      limpiarPantalla();
      window.sessionStorage.clear();
      await montar(createElement(Entrar));
      await pulsar("Sign in");
      if (pestana) await pulsar(pestana);
      await pulsar("Continue with Apple");
      intenciones.push(window.sessionStorage.getItem(CLAVE_INTENCION));
      assert.match(document.querySelector('[role="status"]')?.textContent ?? "", /isn't set up yet/);
    }
    assert.deepEqual(intenciones, ["signin", "signup"]);
  } finally {
    console.error = error;
    if (previo !== undefined) process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
    window.sessionStorage.clear();
    await desmontar();
    limpiarPantalla();
  }
});

test("Try the demo abre la sesión y no se queda en un panel oculto", async () => {
  const original = globalThis.fetch;
  const pedidos: { url: string; rol: unknown }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const cuerpo = JSON.parse(String(init?.body)) as { rol?: unknown };
    pedidos.push({ url: String(input), rol: cuerpo.rol });
    return new Response(JSON.stringify({ rol: cuerpo.rol }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const destinos: string[] = [];
  const asignar = window.location.assign.bind(window.location);
  window.location.assign = ((url: string | URL) => {
    destinos.push(String(url));
  }) as typeof window.location.assign;
  try {
    await montar(createElement(Entrar, { abrirLogin: true, demoHabilitado: true, atiendeUrl: false }));
    await pulsar("Try the demo");
    assert.deepEqual(pedidos, [{ url: "/api/sesion/demo", rol: "organizador" }]);
    assert.deepEqual(destinos, ["/eventos"]);
  } finally {
    globalThis.fetch = original;
    window.location.assign = asignar;
    await desmontar();
    limpiarPantalla();
  }
});

test("en un preview de Vercel, Google no pide el redirect y explica que OAuth se prueba en producción", async () => {
  const dom = window as unknown as { happyDOM: { setURL: (url: string) => void } };
  const anterior = window.location.href;
  dom.happyDOM.setURL("https://hyto-git-cursor-security-gaps-d37a-vallesjo781-3057s-projects.vercel.app/");
  const original = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = (async () => {
    llamadas += 1;
    return new Response("{}", { status: 500 });
  }) as typeof fetch;
  try {
    await montar(createElement(Entrar, { abrirLogin: true, atiendeUrl: false, politica: async () => POLITICA_INACTIVA }));
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /preview address is not registered with Cavos/);
    await pulsar("Continue with Google");
    assert.equal(llamadas, 0);
    assert.match(document.body.textContent ?? "", /preview address is not registered with Cavos/);
  } finally {
    globalThis.fetch = original;
    dom.happyDOM.setURL(anterior);
    await desmontar();
    limpiarPantalla();
  }
});

test("dos Entrar en la misma página (Hero y Cierre) no repiten ids", async () => {
  limpiarPantalla();
  try {
    await montar(createElement("div", null, createElement(Entrar, { demoHabilitado: true }), createElement(Entrar, { demoHabilitado: true })));
    const ids = [...document.querySelectorAll("[id]")].map((nodo) => nodo.id);
    assert.ok(ids.length >= 4, ids.join(", "));
    assert.equal(new Set(ids).size, ids.length, ids.join(", "));
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
