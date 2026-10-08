import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import { POLITICA_INACTIVA } from "./enclave";
import { CLAVE_RETO_CORREO, nonceDe } from "./retoCorreo";

const NONCE = "nonce-fijo";

type AuthPrueba = {
  pendingNonce: string | null;
  sendOtp(email: string): Promise<void>;
};

function authNuevo(): AuthPrueba {
  return {
    pendingNonce: null,
    async sendOtp() {
      this.pendingNonce = NONCE;
    },
  };
}

function conAppId(): () => void {
  const previo = process.env.NEXT_PUBLIC_CAVOS_APP_ID;
  process.env.NEXT_PUBLIC_CAVOS_APP_ID = "app-prueba";
  return () => {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_CAVOS_APP_ID;
    else process.env.NEXT_PUBLIC_CAVOS_APP_ID = previo;
  };
}

test("una recarga en «revisa tu correo» conserva el código y el mismo nonce", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  const restaurar = conAppId();
  const nonces: Array<string | null> = [];
  const props = {
    abrirLogin: true,
    politica: async () => POLITICA_INACTIVA,
    esperaMinima: 0,
    crear: async () => authNuevo(),
    confirmarCodigo: async (auth: object) => {
      nonces.push(nonceDe(auth));
      return { aviso: "That code does not match. Check your email and try again.", direccion: null, guardada: false };
    },
  };
  try {
    await montar(createElement(Entrar, props));
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continue with email");
    assert.match(texto(), /Check your email/);
    assert.match(window.sessionStorage.getItem(CLAVE_RETO_CORREO) ?? "", /nonce-fijo/);

    await desmontar();
    await montar(createElement(Entrar, props));
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /Check your email/);
    assert.match(texto(), /ana@example.com/);
    await escribir('input[autocomplete="one-time-code"]', "123456");
    assert.deepEqual(nonces, [NONCE]);
    assert.match(texto(), /That code doesn't match/);
  } finally {
    restaurar();
    window.sessionStorage.clear();
    await desmontar();
    limpiarPantalla();
  }
});

test("cambiar el correo olvida el reto, y la pestaña sigue el idioma", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  const restaurar = conAppId();
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(Entrar, {
          abrirLogin: true,
          tituloDocumento: true,
          politica: async () => POLITICA_INACTIVA,
          esperaMinima: 0,
          crear: async () => authNuevo(),
        }),
      }),
    );
    assert.equal(document.title, "Hyto · Entrar");
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continuar con correo");
    assert.match(texto(), /Revisa tu correo/);
    await pulsar("Cambiar correo");
    assert.equal(window.sessionStorage.getItem(CLAVE_RETO_CORREO), null);
    await desmontar();
    await montar(
      createElement(Entrar, {
        abrirLogin: true,
        tituloDocumento: true,
        politica: async () => POLITICA_INACTIVA,
        crear: async () => authNuevo(),
      }),
    );
    assert.equal(document.title, "Hyto · Sign in");
    assert.doesNotMatch(texto(), /Check your email|Revisa tu correo/);
  } finally {
    restaurar();
    window.sessionStorage.clear();
    await desmontar();
    limpiarPantalla();
  }
});
