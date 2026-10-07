import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { POLITICA_INACTIVA } from "./enclave";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { Marco } from "../../components/admin/Marco";
import { MisTareas } from "../../components/integrante/MisTareas";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import { AVISO_CUENTA_FAUCET } from "../integrante/friendbot";
import type { Tarea } from "../integrante/tipos";
import { mensajeClaro } from "../ui/claro";

const DIRECCION = `G${"B".repeat(55)}`;
const DESTINO = "/";

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
  confirmarCodigo: (
    auth: { sendOtp(email: string): Promise<void> },
    email: string,
    codigo: string,
    intencion: string,
  ) => Promise<{
    aviso: string | null;
    direccion: string | null;
    guardada: boolean;
  }>,
): Promise<void> {
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-prueba";
  try {
  await montar(
    createElement(Entrar, {
      crear: async () => ({ sendOtp: async () => undefined }),
      politica: async () => POLITICA_INACTIVA,
      confirmarCodigo,
      esperaMinima: 0,
    }),
  );
  await act(async () => {
    await Promise.resolve();
  });
  await pulsar("Sign up");
  await escribir('input[type="email"]', "ana@example.com");
  await pulsar("Continue with email");
  // The sixth digit sends the code on its own.
  await escribir('input[autocomplete="one-time-code"]', "123456");
  } finally {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
  }
}

test("tras el código con next=/join/CODE vuelve al join y no a Mis tareas", async () => {
  limpiarPantalla();
  window.history.replaceState(null, "", "/?signin=1&next=%2Fjoin%2FCODE");
  window.sessionStorage.clear();
  const destinos: string[] = [];
  const asignar = window.location.assign.bind(window.location);
  window.location.assign = ((url: string | URL) => {
    destinos.push(String(url));
  }) as Location["assign"];
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-prueba";
  try {
    await montar(
      createElement(Entrar, {
        crear: async () => ({ sendOtp: async () => undefined }),
        politica: async () => POLITICA_INACTIVA,
        confirmarCodigo: async () => ({ aviso: null, direccion: DIRECCION, guardada: true }),
        esperaMinima: 0,
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continue with email");
    await escribir('input[autocomplete="one-time-code"]', "123456");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320));
    });
    assert.match(texto(), /You're in\./);
    await pulsar("Continue");
    assert.deepEqual(destinos, ["/join/CODE"]);
  } finally {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
    window.location.assign = asignar;
    window.history.replaceState(null, "", "/");
    window.sessionStorage.clear();
    await desmontar();
    limpiarPantalla();
  }
});

test("tras el código, la pantalla de éxito lleva a Events (/) como Google y no a Mis tareas", async () => {
  limpiarPantalla();
  const destinos: string[] = [];
  const asignar = window.location.assign.bind(window.location);
  window.location.assign = ((url: string | URL) => {
    destinos.push(String(url));
  }) as Location["assign"];
  try {
    await llegarAlCodigo(async () => ({ aviso: null, direccion: DIRECCION, guardada: true }));
    assert.match(texto(), /Check your email/);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320));
    });
    assert.match(texto(), /You're in\./);
    await pulsar("Continue");
    assert.deepEqual(destinos, [DESTINO]);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });
    assert.deepEqual(destinos, [DESTINO, DESTINO]);
    assert.equal(JSON.parse(window.localStorage.getItem("hyto-admin") ?? "{}").direccion, DIRECCION);
  } finally {
    window.location.assign = asignar;
    await desmontar();
    limpiarPantalla();
  }
});

test("si el alta de testnet falla después del código, queda adentro con el aviso, Open Events y la salida", async () => {
  limpiarPantalla();
  window.history.replaceState(null, "", "/");
  try {
    await llegarAlCodigo(async () => ({ aviso: AVISO_CUENTA_FAUCET, direccion: DIRECCION, guardada: true }));
    assert.match(texto(), /Signed in/);
    const aviso = document.querySelector('[role="status"]')?.textContent ?? "";
    assert.ok(aviso.includes(mensajeClaro(AVISO_CUENTA_FAUCET)), aviso);
    assert.match(aviso, /Open Events and tap Get ready to be paid/);
    assert.equal(document.querySelector('[role="status"] a[href="/eventos"]')?.textContent, "Open Events");
    assert.equal(salida().getAttribute("href"), DESTINO);
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(window.location.pathname, "/");
    assert.equal(JSON.parse(window.localStorage.getItem("hyto-admin") ?? "{}").direccion, DIRECCION);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("si el servidor no guardó la wallet, el código no deja la dirección en el navegador", async () => {
  limpiarPantalla();
  try {
    await llegarAlCodigo(async () => ({ aviso: "Could not save this session's wallet.", direccion: DIRECCION, guardada: false }));
    assert.match(texto(), /Could not save this session's wallet/);
    assert.doesNotMatch(texto(), /Signed in/);
    assert.equal(document.querySelector("a.hyto-post-login-cta"), null);
    assert.equal(window.localStorage.getItem("hyto-admin"), null);
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
    assert.match(document.querySelector('[role="alert"]')?.textContent ?? "", /That code doesn't match/);
    assert.ok(document.querySelector(".hyto-login-otp.is-mal"));
    assert.match(texto(), /Try again/);
    assert.match(texto(), /Resend code/);
    assert.equal(document.querySelector("a.hyto-post-login-cta"), null);
    assert.ok(document.querySelector('[role="dialog"]'));
    // The next keystroke clears the cells and the error.
    await escribir('input[autocomplete="one-time-code"]', "7");
    assert.equal(document.querySelector('[role="alert"]'), null);
    assert.equal(document.querySelector(".hyto-login-otp.is-mal"), null);
    const celdas = [...document.querySelectorAll<HTMLInputElement>(".hyto-login-otp input")].map((celda) => celda.value);
    assert.deepEqual(celdas, ["7", "", "", "", "", ""]);

    await llegarAlCodigo(async () => {
      throw new Error('{"error":"code_expired","message":"The code has expired"}');
    });
    assert.match(document.querySelector('[role="alert"]')?.textContent ?? "", /That code expired/);
    assert.equal(document.querySelector(".hyto-login-otp.is-mal"), null);
    assert.match(texto(), /Request another code/);
    assert.match(texto(), /Use another email/);
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
      await llegarAlCodigo(async () => ({ aviso: null, direccion: DIRECCION, guardada: true }));
      assert.match(texto(), /Could not save in this browser/);
      assert.match(texto(), /Create account/);
      assert.match(texto(), /Resend code/);
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
  prioridad: "normal",
  dificultad: null,
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
    assert.equal(document.querySelector('a[href="/eventos"]') !== null, true);
    assert.match(document.querySelector("h1")?.textContent ?? "", /My tasks|Good morning|Good afternoon|Good evening/);

    globalThis.fetch = fetchTareas([TAREA]);
    await montar(createElement(Marco, { children: createElement(MisTareas) }), { ruta: DESTINO });
    await esperar(() => texto().includes("Booth"));
    assert.doesNotMatch(texto(), /No tasks yet/);
    assert.match(document.querySelector("h1")?.textContent ?? "", /My tasks|Good morning|Good afternoon|Good evening/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
