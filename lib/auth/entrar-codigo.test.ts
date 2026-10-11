import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import { texto as frase } from "../ui/diccionario";
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

function relojDePrueba(): () => void {
  const setTimeoutPrevio = window.setTimeout;
  const clearTimeoutPrevio = window.clearTimeout;
  mock.timers.enable({ apis: ["setTimeout"] });
  window.setTimeout = globalThis.setTimeout.bind(globalThis);
  window.clearTimeout = globalThis.clearTimeout.bind(globalThis);
  return () => {
    mock.timers.reset();
    window.setTimeout = setTimeoutPrevio;
    window.clearTimeout = clearTimeoutPrevio;
  };
}

async function soltarReloj(parar: () => void): Promise<void> {
  try {
    await desmontar();
  } finally {
    parar();
  }
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
    assert.match(texto(), /Espere 19 s antes de pedir otro código/);
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
  const pararReloj = relojDePrueba();
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
    await soltarReloj(pararReloj);
    restaurar();
    window.sessionStorage.clear();
    limpiarPantalla();
  }
});

function botonReenvio(): HTMLButtonElement {
  const control = document.querySelector(".hyto-login-reenvio button");
  if (!(control instanceof HTMLButtonElement)) throw new Error("sin reenvío");
  return control;
}

async function avanzar(segundos: number): Promise<void> {
  for (let i = 0; i < segundos; i += 1) {
    await act(async () => {
      mock.timers.tick(1000);
    });
  }
}

test("la cuenta de reenviar sale del Retry-After, y al llegar a 0 el primer toque manda el código", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  const restaurar = conAppId();
  const original = globalThis.fetch;
  const pararReloj = relojDePrueba();
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ status: "sent" }), {
      status: 200,
      headers: { "content-type": "application/json", "retry-after": "45" },
    });
  const auth = authNuevo();
  auth.sendOtp = async function (this: AuthPrueba) {
    this.envios += 1;
    const respuesta = await fetch("https://cavos.xyz/api/oauth/firebase/otp/request", { method: "POST", body: "{}" });
    if (!respuesta.ok) throw new Error("no");
    this.pendingNonce = `nonce-${this.envios}`;
  };
  try {
    await entrar("en", auth);
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continue with email");
    const control = botonReenvio();
    assert.match(control.textContent ?? "", /Resend code in 0:45/);
    assert.equal(control.classList.contains("is-espera"), true);
    await avanzar(20);
    assert.match(botonReenvio().textContent ?? "", /Resend code in/);
    await act(async () => {
      botonReenvio().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(auth.envios, 1);

    await avanzar(24);
    await act(async () => {
      mock.timers.tick(1000);
      botonReenvio().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(auth.envios, 2);
    assert.equal(texto().includes("No connection"), false);
  } finally {
    globalThis.fetch = original;
    await soltarReloj(pararReloj);
    restaurar();
    window.sessionStorage.clear();
    limpiarPantalla();
  }
});

test("Escape y el logo vuelven al correo, no al selector sin estilos", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  const restaurar = conAppId();
  try {
    await entrar("en", authNuevo());
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continue with email");
    assert.match(texto(), /Check your email/);
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    assert.ok(document.querySelector('input[type="email"]'));
    assert.equal(document.querySelector(".hyto-entry-signup"), null);
    assert.equal(window.sessionStorage.getItem(CLAVE_RETO_CORREO), null);
    assert.match(texto(), /Continue with email/);

    await desmontar();
    limpiarPantalla();
    window.sessionStorage.clear();
    await entrar("en", authNuevo());
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continue with email");
    const logo = document.querySelector(".hyto-login-logo");
    assert.ok(logo);
    await act(async () => {
      logo.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.ok(document.querySelector('input[type="email"]'));
    assert.equal(document.querySelector(".hyto-entry-signup"), null);
    assert.equal(window.sessionStorage.getItem(CLAVE_RETO_CORREO), null);
  } finally {
    restaurar();
    window.sessionStorage.clear();
    await desmontar();
    limpiarPantalla();
  }
});

test("si cambiar el correo da 429, «ya tengo un código» vuelve al paso del código", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  const restaurar = conAppId();
  const pararReloj = relojDePrueba();
  const nonces: Array<string | null> = [];
  const auth = authNuevo(2);
  try {
    assert.equal(frase("en", "entrar.yaTengoCodigo"), "I already have a code");
    assert.equal(frase("es", "entrar.yaTengoCodigo"), "Ya tengo un código");
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(Entrar, {
          abrirLogin: true,
          politica: async () => POLITICA_INACTIVA,
          esperaMinima: 0,
          crear: async () => auth,
          confirmarCodigo: async (instancia: object) => {
            nonces.push(nonceDe(instancia));
            return { aviso: "That code does not match. Check your email and try again.", direccion: null, guardada: false };
          },
        }),
      }),
    );
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continuar con correo");
    await pulsar("Cambiar correo");
    assert.equal(window.sessionStorage.getItem(CLAVE_RETO_CORREO), null);
    await avanzar(20);
    await pulsar("Continuar con correo");
    assert.match(texto(), /Espere 19 s antes de pedir otro código/);
    assert.equal(texto().includes("No hay conexión"), false);
    assert.ok(document.querySelector('input[type="email"]'));
    await pulsar("Ya tengo un código");
    assert.match(texto(), /Revise su correo/);
    assert.equal(document.querySelector('input[type="email"]'), null);
    await escribir('input[autocomplete="one-time-code"]', "123456");
    assert.deepEqual(nonces, ["nonce-1"]);
  } finally {
    await soltarReloj(pararReloj);
    restaurar();
    window.sessionStorage.clear();
    limpiarPantalla();
  }
});

test("sin red, reenviar conserva los dígitos y dice que no hay conexión", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  const restaurar = conAppId();
  const pararReloj = relojDePrueba();
  const auth: AuthPrueba = {
    pendingNonce: null,
    envios: 0,
    fallarDesde: 2,
    async sendOtp() {
      this.envios += 1;
      this.pendingNonce = `nonce-${this.envios}`;
      if (this.envios >= 2) throw new TypeError("Failed to fetch");
    },
  };
  try {
    await entrar("es", auth);
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continuar con correo");
    await escribir('input[autocomplete="one-time-code"]', "123");
    await avanzar(19);
    await act(async () => {
      mock.timers.tick(1000);
      botonReenvio().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const celdas = [...document.querySelectorAll(".hyto-login-otp input")];
    assert.deepEqual(
      celdas.map((celda) => (celda instanceof HTMLInputElement ? celda.value : "")),
      ["1", "2", "3", "", "", ""],
    );
    assert.match(texto(), /No hay conexión\. Revise la red e intente de nuevo\./);
    assert.equal(texto().includes("Espera"), false);
    assert.equal(auth.envios, 2);
  } finally {
    await soltarReloj(pararReloj);
    restaurar();
    window.sessionStorage.clear();
    limpiarPantalla();
  }
});

test("al recargar en el paso del código la cuenta regresiva sigue, y el reenvío no sale antes", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  const restaurar = conAppId();
  const pararReloj = relojDePrueba();
  const auth = authNuevo();
  const props = {
    abrirLogin: true,
    politica: async () => POLITICA_INACTIVA,
    esperaMinima: 0,
    crear: async () => auth,
  };
  try {
    await montar(createElement(Entrar, props));
    await escribir('input[type="email"]', "ana@example.com");
    await pulsar("Continue with email");
    assert.match(botonReenvio().textContent ?? "", /Resend code in/);
    await desmontar();
    await montar(createElement(Entrar, props));
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /Check your email/);
    const control = botonReenvio();
    assert.equal(control.classList.contains("is-espera"), true);
    assert.match(control.textContent ?? "", /Resend code in/);
    await act(async () => {
      control.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(auth.envios, 1);
    await avanzar(19);
    await act(async () => {
      mock.timers.tick(1000);
      botonReenvio().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(auth.envios, 2);
  } finally {
    await soltarReloj(pararReloj);
    restaurar();
    window.sessionStorage.clear();
    limpiarPantalla();
  }
});
