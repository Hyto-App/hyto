import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { POLITICA_INACTIVA, type PoliticaRecuperacion } from "./enclave";
import { AVISO_METODO_RECUPERACION } from "./errores";
import { CLAVE_INTENCION_ENLACE } from "./intencion";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

async function abrirIngreso(politica: PoliticaRecuperacion, extra: Record<string, unknown> = {}) {
  await montar(createElement(Entrar, { politica: async () => politica, esperaMinima: 0, ...extra }));
  await act(async () => {
    await Promise.resolve();
  });
  await pulsar("Sign in");
}

async function conAppId(trabajo: () => Promise<void>) {
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-prueba";
  try {
    await trabajo();
  } finally {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
    window.sessionStorage.clear();
  }
}

test("sin recuperación de Cavos (lo de hoy) siguen Google, Apple y el código por correo", async () => {
  limpiarPantalla();
  try {
    await abrirIngreso(POLITICA_INACTIVA);
    const pantalla = texto();
    assert.match(pantalla, /Continue with Google/);
    assert.match(pantalla, /Continue with Apple/);
    assert.match(pantalla, /or with your email/);
    assert.match(pantalla, /6-digit code/);
    assert.ok(document.querySelector('input[type="email"]'));
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("con la recuperación en Google solo se ofrece Google", async () => {
  limpiarPantalla();
  try {
    await abrirIngreso({ activa: true, proveedor: "google" });
    const pantalla = texto();
    assert.match(pantalla, /Continue with Google/);
    assert.doesNotMatch(pantalla, /Continue with Apple/);
    assert.doesNotMatch(pantalla, /or with your email/);
    assert.equal(document.querySelector('input[type="email"]'), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("con la recuperación en Apple solo se ofrece Apple", async () => {
  limpiarPantalla();
  try {
    await abrirIngreso({ activa: true, proveedor: "apple" });
    const pantalla = texto();
    assert.match(pantalla, /Continue with Apple/);
    assert.doesNotMatch(pantalla, /Continue with Google/);
    assert.equal(document.querySelector('input[type="email"]'), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("con la recuperación en correo, el correo manda un enlace (no un código) y guarda la intención para otra pestaña", async () => {
  limpiarPantalla();
  await conAppId(async () => {
    const enviados: { tipo: string; correo: string; url: string }[] = [];
    window.history.replaceState(null, "", "/?signin=1&next=%2Ftareas%2F7");
    await abrirIngreso(
      { activa: true, proveedor: "email" },
      {
        crear: async () => ({
          sendOtp: async (correo: string) => void enviados.push({ tipo: "codigo", correo, url: window.location.href }),
          sendMagicLink: async (correo: string) => void enviados.push({ tipo: "enlace", correo, url: window.location.href }),
        }),
      },
    );
    const pantalla = texto();
    assert.doesNotMatch(pantalla, /Continue with Google/);
    assert.doesNotMatch(pantalla, /Continue with Apple/);
    assert.match(pantalla, /sign-in link/);
    await pulsar("Create account");
    await escribir('input[type="email"]', "Ana@Example.com");
    await pulsar("Continue with email");

    // The link is asked from the clean URL, the same redirect the return exchange sends.
    assert.deepEqual(enviados, [{ tipo: "enlace", correo: "ana@example.com", url: "http://localhost/" }]);
    const despues = texto();
    assert.match(despues, /We sent a sign-in link to/);
    assert.match(despues, /ana@example\.com/);
    assert.equal(document.querySelector('input[autocomplete="one-time-code"]'), null);
    const guardada = JSON.parse(window.localStorage.getItem(CLAVE_INTENCION_ENLACE) ?? "{}") as { intencion?: string; retorno?: string };
    assert.equal(guardada.intencion, "signup");
    assert.equal(guardada.retorno, "/tareas/7");

    await pulsar("Use another email");
    assert.ok(document.querySelector('input[type="email"]'));
  });
});

test("si la recuperación pide Google, el correo no manda un código que Cavos rechazaría", async () => {
  limpiarPantalla();
  await conAppId(async () => {
    let enviados = 0;
    let politica: PoliticaRecuperacion = POLITICA_INACTIVA;
    await abrirIngreso(POLITICA_INACTIVA, {
      // The screen loaded before Cavos answered; by the time the person sends, Google is required.
      politica: async () => politica,
      crear: async () => ({
        sendOtp: async () => void (enviados += 1),
        sendMagicLink: async () => void (enviados += 1),
      }),
    });
    politica = { activa: true, proveedor: "google" };
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continue with email");
    assert.equal(enviados, 0);
    assert.match(texto(), new RegExp(AVISO_METODO_RECUPERACION.slice(0, 30)));
    assert.equal(document.querySelector('input[type="email"]'), null, "the screen now shows only Google");
  });
});
