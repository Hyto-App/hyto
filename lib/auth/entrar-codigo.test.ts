import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import { POLITICA_INACTIVA } from "./enclave";
import { CLAVE_RETO_CORREO, nonceDe } from "./retoCorreo";

const CRUDO_429 =
  'kit/auth: /api/oauth/firebase/otp/request -> 429 {"error":"rate_limited","message":"Please wait 19 seconds before requesting another code.","wait_seconds":19}';

type AuthPrueba = {
  pendingNonce: string | null;
  envios: number;
  fallarDesde: number;
  sendOtp(email: string): Promise<void>;
};

function authNuevo(fallarDesde = Number.POSITIVE_INFINITY): AuthPrueba {
  return {
    pendingNonce: null,
    envios: 0,
    fallarDesde,
    async sendOtp() {
      this.envios += 1;
      this.pendingNonce = `nonce-${this.envios}`;
      if (this.envios >= this.fallarDesde) throw new Error(CRUDO_429);
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

async function entrar(idioma: "en" | "es", auth: AuthPrueba): Promise<void> {
  const pantalla = createElement(Entrar, {
    abrirLogin: true,
    politica: async () => POLITICA_INACTIVA,
    esperaMinima: 0,
    crear: async () => auth,
  });
  await montar(idioma === "es" ? createElement(ProveedorIdioma, { idioma: "es", children: pantalla }) : pantalla);
}

test("un 429 al pedir el código dice cuántos segundos faltan, en los dos idiomas", async () => {
  limpiarPantalla();
  const restaurar = conAppId();
  try {
    await entrar("es", authNuevo(1));
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continuar con correo");
    assert.match(texto(), /Espera 19 s antes de pedir otro código/);
    assert.equal(texto().includes("No hay conexión"), false);
    assert.equal(window.sessionStorage.getItem(CLAVE_RETO_CORREO), null);

    await desmontar();
    limpiarPantalla();
    await entrar("en", authNuevo(1));
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continue with email");
    assert.match(texto(), /Wait 19 s before requesting another code/);
    assert.equal(texto().includes("No connection"), false);
  } finally {
    restaurar();
    window.sessionStorage.clear();
    await desmontar();
    limpiarPantalla();
  }
});

test("un corte de red sigue diciendo que no hay conexión", async () => {
  limpiarPantalla();
  const restaurar = conAppId();
  const auth: AuthPrueba = {
    pendingNonce: null,
    envios: 0,
    fallarDesde: 1,
    async sendOtp() {
      throw new TypeError("Failed to fetch");
    },
  };
  try {
    await entrar("es", auth);
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continuar con correo");
    assert.match(texto(), /No hay conexión/);
    assert.equal(texto().includes("Espera"), false);
  } finally {
    restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("el primer toque al llegar a 0 reenvía, y un 429 no cambia el código que ya salió", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  const restaurar = conAppId();
  mock.timers.enable({ apis: ["setTimeout"] });
  window.setTimeout = globalThis.setTimeout.bind(globalThis);
  window.clearTimeout = globalThis.clearTimeout.bind(globalThis);
  const auth = authNuevo(2);
  const nonces: Array<string | null> = [];
  try {
    await montar(
      createElement(Entrar, {
        abrirLogin: true,
        politica: async () => POLITICA_INACTIVA,
        esperaMinima: 0,
        crear: async () => auth,
        confirmarCodigo: async (instancia: object) => {
          nonces.push(nonceDe(instancia));
          return { aviso: "That code does not match. Check your email and try again.", direccion: null, guardada: false };
        },
      }),
    );
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continue with email");
    assert.equal(auth.envios, 1);
    assert.match(window.sessionStorage.getItem(CLAVE_RETO_CORREO) ?? "", /nonce-1/);
    const control = document.querySelector(".hyto-login-reenvio button");
    assert.ok(control instanceof HTMLButtonElement);
    assert.equal(control.classList.contains("is-espera"), true);
    assert.match(control.textContent ?? "", /Resend code in/);

    for (let i = 0; i < 19; i += 1) {
      await act(async () => {
        mock.timers.tick(1000);
      });
    }
    await act(async () => {
      mock.timers.tick(1000);
      control.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(document.querySelector(".hyto-login-reenvio button"), control);
    assert.equal(auth.envios, 2);
    assert.match(texto(), /Wait 19 s before requesting another code/);
    assert.equal(texto().includes("No connection"), false);
    assert.match(window.sessionStorage.getItem(CLAVE_RETO_CORREO) ?? "", /nonce-1/);
    assert.equal(auth.pendingNonce, "nonce-1");

    await escribir('input[autocomplete="one-time-code"]', "123456");
    assert.deepEqual(nonces, ["nonce-1"]);
  } finally {
    mock.timers.reset();
    restaurar();
    window.sessionStorage.clear();
    await desmontar();
    limpiarPantalla();
  }
});
