import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { ListaEventos } from "../../components/admin/ListaEventos";
import { Bienvenida } from "../../components/sesion/Bienvenida";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("la bienvenida muestra el primer paso y cada estado del cobro", async () => {
  limpiarPantalla();
  try {
    let soltar: (valor: boolean) => void = () => undefined;
    await montar(
      createElement(Bienvenida, {
        consultar: () =>
          new Promise<boolean>((ok) => {
            soltar = ok;
          }),
        preparar: async () => ({ hash: null }),
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /You're in/);
    assert.match(texto(), /Take your first step/);
    assert.match(texto(), /Checking your payout account/);
    assert.equal(document.querySelector('[data-estado="comprobando"]') !== null, true);

    await act(async () => {
      soltar(true);
    });
    assert.match(texto(), /Ready to be paid/);
    assert.equal(document.querySelector(".hyto-payout.is-done") !== null, true);
    assert.equal(document.querySelector("button"), null);

    let resolver: (valor: { hash: string | null }) => void = () => undefined;
    await montar(
      createElement(Bienvenida, {
        consultar: async () => false,
        preparar: () =>
          new Promise<{ hash: string | null }>((ok) => {
            resolver = ok;
          }),
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /Take your first step/);
    assert.match(texto(), /Get ready to be paid/);
    await pulsar("Get ready to be paid");
    assert.match(texto(), /Getting ready/);
    await act(async () => {
      resolver({ hash: "abc" });
    });
    assert.match(texto(), /Payout account ready/);
    assert.equal(document.querySelector(".hyto-payout.is-done") !== null, true);
    assert.match(texto(), /View on blockchain/);

    await montar(
      createElement(Bienvenida, {
        consultar: async () => false,
        preparar: async () => {
          throw new Error("Could not submit the USDC trustline.");
        },
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    await pulsar("Get ready to be paid");
    assert.match(texto(), /couldn't finish setting up payouts/);
    assert.match(texto(), /Get ready to be paid/);
    assert.equal(document.querySelector('[data-estado="error"]') !== null, true);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("en demo la bienvenida no pide el cobro", async () => {
  limpiarPantalla();
  let llamadas = 0;
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "voluntario",
        children: createElement(Bienvenida, {
          consultar: async () => {
            llamadas += 1;
            return false;
          },
        }),
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /You're in/);
    assert.match(texto(), /Do the task, send a photo/);
    assert.match(texto(), /volunteer view/);
    assert.match(texto(), /No money moves in the demo/);
    assert.doesNotMatch(texto(), /can't set up payouts/);
    assert.doesNotMatch(texto(), /Take your first step/);
    assert.doesNotMatch(texto(), /Get ready to be paid/);
    assert.equal(llamadas, 0);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("el organizador no ve el cobro ni la bienvenida de quien hace la tarea", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/usdc")) return json({ listo: true });
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK", rol: "organizer", pendientes: 1 }] });
    return json({}, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(ListaEventos));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.match(texto(), /You organize the event/);
    assert.doesNotMatch(texto(), /Do the task, send a photo/);
    assert.doesNotMatch(texto(), /Ready to be paid/);
    assert.doesNotMatch(texto(), /Get ready to be paid/);
    assert.doesNotMatch(texto(), /digital dollars \(USDC\)/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("el demo organizador no ve el aviso de cobro", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "organizador",
        children: createElement(Bienvenida),
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /organizer view/);
    assert.match(texto(), /No money moves in the demo/);
    assert.doesNotMatch(texto(), /can't set up payouts/);
    assert.doesNotMatch(texto(), /Do the task, send a photo/);
    assert.doesNotMatch(texto(), /Ready to be paid/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("el demo voluntario no ve el botón de crear evento", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/proyectos")) return json({ proyectos: [] });
    return json({}, 404);
  }) as typeof fetch;
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "voluntario",
        children: createElement(ListaEventos),
      }),
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(document.querySelector('a[href="/eventos/nuevo"]'), null);
    assert.match(texto(), /volunteer view/);
    assert.doesNotMatch(texto(), /You organize the event/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("eventos muestra la bienvenida y la cuenta ya no tiene el botón", async () => {
  limpiarPantalla();
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/usdc")) return json({ listo: false });
    if (url.includes("/api/proyectos")) return json({ proyectos: [] });
    return json({}, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(ListaEventos));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.match(texto(), /You're in/);
    assert.match(texto(), /Take your first step/);
    assert.match(texto(), /No events yet/);
    const cuenta = readFileSync(new URL("../../app/(integrante)/cuentas/page.tsx", import.meta.url), "utf8");
    assert.equal(cuenta.includes("PrepararUsdc"), false);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
