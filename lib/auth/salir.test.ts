import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { Salir } from "../../components/sesion/Salir";
import { SalirDemo } from "../../components/sesion/SalirDemo";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

const DIRECCION = `G${"A".repeat(55)}`;

test("Sign out borra la wallet local y entra al ingreso aunque el servidor falle", async () => {
  limpiarPantalla();
  window.localStorage.setItem(
    "hyto-admin",
    JSON.stringify({ decisiones: {}, proyecto: null, direccion: DIRECCION }),
  );
  const original = globalThis.fetch;
  let deleteLlamado = false;
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "DELETE") {
      deleteLlamado = true;
      throw new Error("network down");
    }
    return new Response(JSON.stringify({ aviso: "Sign in to continue." }), { status: 401 });
  };
  try {
    await montar(createElement(Salir));
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /Sign out/);
    await pulsar("Sign out");
    assert.equal(deleteLlamado, true);
    assert.match(window.location.href, /signin=1/);
    const memoria = JSON.parse(window.localStorage.getItem("hyto-admin") ?? "{}") as { direccion?: string | null };
    assert.equal(memoria.direccion ?? null, null);
  } finally {
    globalThis.fetch = original;
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});

test("en demo siguen el cambio de rol y Sign out", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "voluntario",
        children: createElement(
          "div",
          null,
          createElement(SalirDemo),
          createElement(Salir),
        ),
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /Salir del demo/);
    assert.match(texto(), /Sign out/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("signin=1 abre el ingreso aunque la wallet siga guardada", async () => {
  limpiarPantalla();
  window.localStorage.setItem(
    "hyto-admin",
    JSON.stringify({ decisiones: {}, proyecto: null, direccion: DIRECCION }),
  );
  window.history.replaceState(null, "", "/?signin=1");
  try {
    await montar(createElement(Entrar));
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /Enviar código/);
    assert.doesNotMatch(texto(), /GAAA/);
  } finally {
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});
