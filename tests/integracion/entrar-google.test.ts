import "./dom-global";
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { leerMemoriaAdmin } from "../../lib/admin/memoria";

const DIRECCION = `G${"A".repeat(55)}`;

const estado = {
  espero: false,
  resolverAuth: (_valor: unknown) => {},
  resolverGoogle: (_valor: { aviso: string | null; direccion: string | null }) => {},
  llamadas: [] as { busqueda: string; redirect: string }[],
};

mock.module("@/lib/auth/cliente", {
  namedExports: {
    crearAuth: async () => {
      estado.espero = true;
      return new Promise((resolve) => {
        estado.resolverAuth = resolve;
      });
    },
    entrarConCodigo: async () => ({ identity: {}, aviso: null, direccion: null }),
    entrarConGoogle: async (_auth: unknown, busqueda: string, redirect: string) => {
      estado.llamadas.push({ busqueda, redirect });
      return new Promise((resolve) => {
        estado.resolverGoogle = resolve;
      });
    },
    redirectLimpio: () => `${window.location.origin}${window.location.pathname}`,
    urlGoogle: async () => "https://accounts.google.example/oauth",
    publicarSesion: async () => ({ ok: true, rol: "organizador" }),
    conectarStellar: async () => {
      throw new Error("no");
    },
  },
});

test(
  "si la persona navega mientras Cavos carga, el ingreso queda guardado con la URL original",
  { todo: "esperado-falla: PR #18 no está mergeado en main" },
  async () => {
    window.localStorage.clear();
    window.location.href = "http://localhost/?cavos_auth_code=codigo-prueba";
    const { Entrar } = await import("../../components/admin/Entrar");
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    await act(async () => {
      root.render(createElement(Entrar));
    });
    assert.equal(estado.espero, true);

    await act(async () => {
      root.unmount();
    });
    window.location.href = "http://localhost/mis-tareas";
    await act(async () => {
      estado.resolverAuth({});
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      estado.resolverGoogle({ aviso: null, direccion: DIRECCION });
      await Promise.resolve();
      await Promise.resolve();
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
    }
    if (leerMemoriaAdmin().direccion !== DIRECCION) {
      fallos.push(`la dirección guardada fue ${String(leerMemoriaAdmin().direccion)}`);
    }
    assert.deepEqual(fallos, []);
  },
);
