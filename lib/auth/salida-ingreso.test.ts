import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { Marco } from "../../components/admin/Marco";
import { MisTareas } from "../../components/integrante/MisTareas";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import type { Tarea } from "../integrante/tipos";

const DIRECCION = `G${"B".repeat(55)}`;
const DESTINO = "/mis-tareas";

function memoriaFirmada(): void {
  window.localStorage.setItem(
    "hyto-admin",
    JSON.stringify({ decisiones: {}, proyecto: null, direccion: DIRECCION }),
  );
}

function salida(): HTMLElement {
  const enlace = document.querySelector("a.hyto-post-login-cta");
  assert.ok(enlace instanceof HTMLElement);
  return enlace;
}

async function llegarAlCodigo(
  confirmarCodigo: (auth: { sendOtp(email: string): Promise<void> }, email: string, codigo: string) => Promise<{
    aviso: string | null;
    direccion: string | null;
  }>,
): Promise<void> {
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-prueba";
  try {
  await montar(
    createElement(Entrar, {
      crear: async () => ({ sendOtp: async () => undefined }),
      confirmarCodigo,
    }),
  );
  await act(async () => {
    await Promise.resolve();
  });
  await pulsar("Sign in");
  await escribir("#correo-entrar", "ana@example.com");
  await pulsar("Send code");
  await escribir("#codigo-entrar", "123456");
  } finally {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
  }
}

test("tras el código, Get ready to be paid abre Mis tareas y no la landing ni Account", async () => {
  limpiarPantalla();
  try {
    await llegarAlCodigo(async () => ({ aviso: null, direccion: DIRECCION }));
    await pulsar("Confirm");
    const enlace = salida();
    assert.equal(enlace.getAttribute("href"), DESTINO);
    assert.equal(enlace.textContent?.trim(), "Get ready to be paid");
    assert.match(texto(), /Take your first step/);
    assert.match(texto(), /Signed in/);
    assert.equal(enlace.getAttribute("href") === "/", false);
    assert.equal(enlace.getAttribute("href") === "/cuentas", false);
    assert.equal(enlace.getAttribute("href") === "/eventos", false);
    assert.equal(document.querySelector('[role="dialog"]'), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("una sesión ya iniciada muestra la misma salida, también en español", async () => {
  limpiarPantalla();
  memoriaFirmada();
  try {
    await montar(createElement(Entrar));
    await act(async () => {
      await Promise.resolve();
    });
    const ingles = salida();
    assert.equal(ingles.getAttribute("href"), DESTINO);
    assert.equal(ingles.textContent?.trim(), "Get ready to be paid");
    assert.match(texto(), /Take your first step/);

    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(Entrar),
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    const espanol = salida();
    assert.equal(espanol.getAttribute("href"), DESTINO);
    assert.equal(espanol.textContent?.trim(), "Preparar el cobro");
    assert.match(texto(), /Da tu primer paso/);
    assert.match(texto(), /Sesión iniciada/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("un código inválido, uno vencido o un navegador lleno siguen en el paso del código", async () => {
  limpiarPantalla();
  try {
    await llegarAlCodigo(async () => {
      throw new Error('{"error":"invalid_code","message":"Invalid code"}');
    });
    await pulsar("Confirm");
    assert.match(texto(), /That code does not match/);
    assert.match(texto(), /Confirm/);
    assert.match(texto(), /Resend code/);
    assert.match(texto(), /Close/);
    assert.equal(document.querySelector("a.hyto-post-login-cta"), null);
    assert.ok(document.querySelector('[role="dialog"]'));

    await llegarAlCodigo(async () => {
      throw new Error('{"error":"code_expired","message":"The code has expired"}');
    });
    await pulsar("Confirm");
    assert.match(texto(), /That code expired/);
    assert.match(texto(), /Resend code/);
    assert.match(texto(), /Close/);
    assert.equal(document.querySelector("a.hyto-post-login-cta"), null);

    const respaldo = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error("full");
        },
        removeItem: () => undefined,
        clear: () => undefined,
        key: () => null,
        length: 0,
      },
    });
    try {
      await llegarAlCodigo(async () => ({ aviso: null, direccion: DIRECCION }));
      await pulsar("Confirm");
      assert.match(texto(), /Could not save in this browser/);
      assert.match(texto(), /Confirm/);
      assert.match(texto(), /Resend code/);
      assert.match(texto(), /Close/);
      assert.equal(document.querySelector("a.hyto-post-login-cta"), null);
    } finally {
      Object.defineProperty(window, "localStorage", { configurable: true, value: respaldo });
    }
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

const TAREA: Tarea = {
  id: "alta",
  proyectoId: "uno",
  titulo: "Booth",
  tipo: "trabajo",
  monto: "30",
  tope: null,
  condicion: "",
  miembroId: "v",
  walletCobro: "",
  estado: "pendiente",
};

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 25; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}

function fetchTareas(tareas: Tarea[]): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/tareas")) {
      return new Response(JSON.stringify({ tareas }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.startsWith("/api/proyectos")) {
      return new Response(JSON.stringify({ proyectos: [{ id: "uno", nombre: "North" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  }) as typeof fetch;
}

test("Mis tareas, el destino del botón, funciona sin tareas y con una tarea", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  try {
    globalThis.fetch = fetchTareas([]);
    await montar(createElement(Marco, { children: createElement(MisTareas) }), { ruta: DESTINO });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await esperar(() => texto().includes("No tasks yet"));
    assert.equal(document.querySelector('a[href="/mis-tareas"]') !== null, true);
    assert.equal(document.querySelector('a[href="/cuentas"]') !== null, true);
    assert.equal(document.querySelector('a[href="/eventos"]') !== null, true);
    assert.equal(document.querySelector("h1")?.textContent, "My tasks");

    globalThis.fetch = fetchTareas([TAREA]);
    await montar(createElement(Marco, { children: createElement(MisTareas) }), { ruta: DESTINO });
    await esperar(() => texto().includes("Booth"));
    assert.doesNotMatch(texto(), /No tasks yet/);
    assert.equal(document.querySelector('a[href="/cuentas"]') !== null, true);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
