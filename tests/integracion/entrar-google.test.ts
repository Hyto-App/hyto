import "./dom-global";
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { StrictMode, createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { leerMemoriaAdmin } from "../../lib/admin/memoria";
import { CLAVE_INTENCION } from "../../lib/auth/intencion";

const DIRECCION = `G${"A".repeat(55)}`;

const estado = {
  espero: false,
  creaciones: 0,
  fallaAuth: null as Error | null,
  resolverAuth: (_valor: unknown) => {},
  resolverGoogle: (_valor: { aviso: string | null; direccion: string | null }) => {},
  llamadas: [] as { busqueda: string; redirect: string; intencion: string }[],
};

mock.module("@/lib/auth/cliente", {
  namedExports: {
    crearAuth: async () => {
      estado.espero = true;
      estado.creaciones += 1;
      if (estado.fallaAuth) throw estado.fallaAuth;
      return new Promise((resolve) => {
        estado.resolverAuth = resolve;
      });
    },
    entrarConCodigo: async () => ({ identity: {}, aviso: null, direccion: null }),
    entrarConGoogle: async (_auth: unknown, busqueda: string, redirect: string, intencion = "signin") => {
      estado.llamadas.push({ busqueda, redirect, intencion });
      return new Promise((resolve) => {
        estado.resolverGoogle = resolve;
      });
    },
    redirectLimpio: () => `${window.location.origin}${window.location.pathname}`,
    urlGoogle: async () => "https://accounts.google.example/oauth",
    publicarSesion: async () => ({ ok: true, rol: "organizador", provisionar: false, nuevo: false }),
    conectarStellar: async () => {
      throw new Error("no");
    },
  },
});

function reiniciar() {
  window.localStorage.clear();
  window.sessionStorage.clear();
  estado.espero = false;
  estado.creaciones = 0;
  estado.fallaAuth = null;
  estado.llamadas = [];
}

async function vaciar() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function montar() {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return { div, root: createRoot(div) };
}

test("si la persona navega mientras Cavos carga, el alta queda guardada con la URL y la intención originales", async () => {
  reiniciar();
  window.sessionStorage.setItem(CLAVE_INTENCION, "signup");
  window.location.href = "http://localhost/?cavos_auth_code=codigo-prueba";
  const { Entrar } = await import("../../components/admin/Entrar");
  const { root } = montar();
  await act(async () => {
    root.render(createElement(Entrar));
  });
  assert.equal(estado.espero, true);

  await act(async () => {
    root.unmount();
  });
  window.location.href = "http://localhost/mis-tareas";
  window.sessionStorage.setItem(CLAVE_INTENCION, "signin");
  await act(async () => {
    estado.resolverAuth({});
    await vaciar();
  });
  await act(async () => {
    estado.resolverGoogle({ aviso: null, direccion: DIRECCION });
    await vaciar();
  });

  const fallos: string[] = [];
  const llamada = estado.llamadas[0];
  if (!llamada) {
    fallos.push("no hubo canje");
  } else {
    if (!llamada.busqueda.includes("cavos_auth_code=codigo-prueba")) {
      fallos.push(`la búsqueda del canje fue ${JSON.stringify(llamada.busqueda)}`);
    }
    if (llamada.redirect !== "http://localhost/") {
      fallos.push(`el redirect del canje fue ${llamada.redirect}`);
    }
    if (llamada.intencion !== "signup") {
      fallos.push(`la intención del canje fue ${llamada.intencion}`);
    }
  }
  if (leerMemoriaAdmin().direccion !== DIRECCION) {
    fallos.push(`la dirección guardada fue ${String(leerMemoriaAdmin().direccion)}`);
  }
  if (window.sessionStorage.getItem(CLAVE_INTENCION) !== null) {
    fallos.push("la intención quedó guardada después del canje");
  }
  assert.deepEqual(fallos, []);
});

test("en Strict Mode el código de Google se canjea una sola vez y Sign in llega como signin", async () => {
  reiniciar();
  window.sessionStorage.setItem(CLAVE_INTENCION, "signin");
  window.location.href = "http://localhost/?cavos_auth_code=codigo-estricto";
  const { Entrar } = await import("../../components/admin/Entrar");
  const { div, root } = montar();
  await act(async () => {
    root.render(createElement(StrictMode, null, createElement(Entrar)));
  });
  await act(async () => {
    estado.resolverAuth({});
    await vaciar();
  });
  await act(async () => {
    estado.resolverGoogle({ aviso: null, direccion: DIRECCION });
    await vaciar();
  });

  assert.equal(estado.creaciones, 1);
  assert.equal(estado.llamadas.length, 1);
  assert.equal(estado.llamadas[0]?.intencion, "signin");
  assert.equal(leerMemoriaAdmin().direccion, DIRECCION);
  assert.match(div.textContent ?? "", /Signed in/);
  await act(async () => {
    root.unmount();
  });
});

test("si crearAuth lanza, el canje termina con un aviso visible", async () => {
  reiniciar();
  window.sessionStorage.setItem(CLAVE_INTENCION, "signup");
  estado.fallaAuth = new Error("cavos no cargó");
  window.location.href = "http://localhost/?cavos_auth_code=codigo-falla";
  const original = console.error;
  console.error = () => {};
  try {
    const { Entrar } = await import("../../components/admin/Entrar");
    const { div, root } = montar();
    await act(async () => {
      root.render(createElement(Entrar));
      await vaciar();
    });
    assert.equal(estado.llamadas.length, 0);
    assert.equal(leerMemoriaAdmin().direccion, null);
    const aviso = div.querySelector('[role="status"]')?.textContent ?? "";
    assert.ok(aviso, "falta el aviso");
    assert.doesNotMatch(aviso, /Setting up your Stellar testnet wallet/);
    await act(async () => {
      root.unmount();
    });
  } finally {
    console.error = original;
  }
});
