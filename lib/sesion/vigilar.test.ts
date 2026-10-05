import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { VigilarSesion } from "../../components/sesion/VigilarSesion";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar } from "../../tests/integracion/montar";

const DIRECCION = `G${"A".repeat(55)}`;

function guardarWallet() {
  window.localStorage.setItem(
    "hyto-admin",
    JSON.stringify({ decisiones: {}, proyecto: null, direccion: DIRECCION }),
  );
}

test("una sesión vencida con wallet guardada abre el ingreso", async () => {
  limpiarPantalla();
  guardarWallet();
  window.history.replaceState(null, "", "/revision/stand");
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ aviso: "Sign in to continue." }), { status: 401 });
  try {
    await montar(createElement(VigilarSesion));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.match(window.location.href, /\/\?signin=1$/);
  } finally {
    globalThis.fetch = original;
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});

test("sin wallet guardada un 401 no cambia de pantalla", async () => {
  limpiarPantalla();
  window.history.replaceState(null, "", "/mis-tareas");
  const original = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = async () => {
    llamadas += 1;
    return new Response(JSON.stringify({ aviso: "Sign in to continue." }), { status: 401 });
  };
  try {
    await montar(createElement(VigilarSesion));
    await act(async () => {
      await Promise.resolve();
    });
    assert.equal(llamadas, 0);
    assert.match(window.location.pathname, /mis-tareas/);
  } finally {
    globalThis.fetch = original;
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});

test("el modo demo no manda al ingreso", async () => {
  limpiarPantalla();
  guardarWallet();
  window.history.replaceState(null, "", "/mis-tareas");
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ aviso: "Sign in to continue." }), { status: 401 });
  try {
    await montar(
      createElement(ProveedorModoDemo, { activo: true, rol: "organizador", children: createElement(VigilarSesion) }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(window.location.pathname, /mis-tareas/);
  } finally {
    globalThis.fetch = original;
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});

test("el regreso de Google con cavos_auth_code no manda al ingreso aunque GET dé 401", async () => {
  limpiarPantalla();
  // Sesión vencida de antes: la wallet sigue en este navegador.
  guardarWallet();
  window.history.replaceState(null, "", "/?cavos_auth_code=abc123");
  const original = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = async () => {
    llamadas += 1;
    return new Response(JSON.stringify({ aviso: "Sign in to continue." }), { status: 401 });
  };
  try {
    await montar(createElement(VigilarSesion));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(llamadas, 0);
    assert.match(window.location.href, /\?cavos_auth_code=abc123$/);
    assert.doesNotMatch(window.location.href, /signin=1/);
  } finally {
    globalThis.fetch = original;
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});
