import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { act, createElement } from "react";
import { PasskeyCuenta } from "../../components/integrante/PasskeyCuenta";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { AVISO_REINGRESO } from "../escrow/firmarCliente";
import { mensajeClaro } from "../ui/claro";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";
import {
  agregarPasskey,
  AVISO_PASSKEY_CANCELADA,
  AVISO_PASSKEY_FALLO,
  AVISO_PASSKEY_SIN_CLAVE,
  AVISO_PASSKEY_SIN_SOPORTE,
  type DatosPasskey,
  type DependenciasPasskey,
} from "./passkey";

const WALLET = "G" + "A".repeat(55);
const DATOS: DatosPasskey = { userId: "user-1", userName: "persona@example.com", appSalt: "hyto", authToken: "tok" };

const avisos: string[] = [];
const warnOriginal = console.warn;

beforeEach(() => {
  avisos.length = 0;
  console.warn = (...partes: unknown[]) => {
    avisos.push(partes.map(String).join(" "));
  };
});

afterEach(() => {
  console.warn = warnOriginal;
});

function deps(cambios: Partial<DependenciasPasskey> & { status?: "ready" | "undeployed" | "needs-device-approval" } = {}) {
  const enroladas: DatosPasskey[] = [];
  const { status = "ready", ...resto } = cambios;
  const base: DependenciasPasskey = {
    soportado: async () => true,
    conectar: async () => ({ cuenta: { address: WALLET, status }, datos: DATOS }),
    enrolar: async (datos) => {
      enroladas.push(datos);
    },
    ...resto,
  };
  return { deps: base, enroladas };
}

test("un navegador con la clave agrega la llave de acceso en el vault de Cavos", async () => {
  const { deps: d, enroladas } = deps();
  await agregarPasskey(d);
  assert.deepEqual(enroladas, [DATOS]);
  assert.deepEqual(avisos, []);
});

test("una cuenta todavía sin desplegar también puede agregar la llave de acceso", async () => {
  const { deps: d, enroladas } = deps({ status: "undeployed" });
  await agregarPasskey(d);
  assert.equal(enroladas.length, 1);
});

test("un navegador sin la clave no pide crear una llave que no abriría nada", async () => {
  const { deps: d, enroladas } = deps({ status: "needs-device-approval" });
  await assert.rejects(() => agregarPasskey(d), (error: unknown) => error instanceof Error && error.message === AVISO_PASSKEY_SIN_CLAVE);
  assert.deepEqual(enroladas, []);
});

test("si el vault dice que este navegador no tiene la clave, se explica dónde agregar la llave", async () => {
  const { deps: d } = deps({
    enrolar: async () => {
      throw new Error("kit/secret: this device does not hold the wallet key. Add the passkey on the device you use to sign.");
    },
  });
  await assert.rejects(() => agregarPasskey(d), (error: unknown) => error instanceof Error && error.message === AVISO_PASSKEY_SIN_CLAVE);
});

test("sin soporte de llaves de acceso no se abre Cavos", async () => {
  let conexiones = 0;
  const { deps: d } = deps({
    soportado: async () => false,
    conectar: async () => {
      conexiones += 1;
      return { cuenta: { address: WALLET, status: "ready" }, datos: DATOS };
    },
  });
  await assert.rejects(() => agregarPasskey(d), (error: unknown) => error instanceof Error && error.message === AVISO_PASSKEY_SIN_SOPORTE);
  assert.equal(conexiones, 0);
});

test("cancelar la ventana de Cavos dice que no se agregó nada", async () => {
  for (const crudo of ["The passkey prompt was cancelled", "NotAllowedError: The operation either timed out or was not allowed."]) {
    const { deps: d } = deps({
      enrolar: async () => {
        throw new Error(crudo);
      },
    });
    await assert.rejects(() => agregarPasskey(d), (error: unknown) => error instanceof Error && error.message === AVISO_PASSKEY_CANCELADA);
  }
  assert.deepEqual(avisos, []);
});

test("un ingreso vencido pide volver a entrar", async () => {
  const { deps: d } = deps({
    conectar: async () => {
      throw new Error("kit/stellar: registry lookup failed: 401");
    },
  });
  await assert.rejects(() => agregarPasskey(d), (error: unknown) => error instanceof Error && error.message === AVISO_REINGRESO);
});

test("otro error de Cavos da un aviso corto y la consola lo guarda sin correo ni token", async () => {
  const { deps: d } = deps({
    enrolar: async () => {
      throw new Error("kit/vault: wrap save failed for persona@example.com with eyJhbGciOi.eyJzdWIiOi.firma");
    },
  });
  await assert.rejects(() => agregarPasskey(d), (error: unknown) => error instanceof Error && error.message === AVISO_PASSKEY_FALLO);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0] ?? "", /^\[passkey\] /);
  assert.doesNotMatch(avisos[0] ?? "", /persona@example\.com|eyJhbGciOi/);
});

test("los avisos de la llave de acceso tienen su traducción", () => {
  for (const aviso of [AVISO_PASSKEY_SIN_SOPORTE, AVISO_PASSKEY_SIN_CLAVE, AVISO_PASSKEY_CANCELADA, AVISO_PASSKEY_FALLO]) {
    assert.equal(mensajeClaro(aviso), aviso);
  }
});

test("la tarjeta de Cuenta agrega la llave de acceso y dice cómo usarla en otro dispositivo", async () => {
  limpiarPantalla();
  let llamadas = 0;
  try {
    await montar(
      createElement(PasskeyCuenta, {
        agregar: async () => {
          llamadas += 1;
        },
      }),
    );
    assert.match(texto(), /Use Hyto on other devices/);
    assert.match(texto(), /Your sign-in is saved only on this device\. Add a passkey so you don't lose your account\./);
    assert.equal(document.querySelector(".hyto-passkey [role='note']")?.textContent?.includes("Add a passkey"), true);
    assert.doesNotMatch(texto(), /account key lives only in this browser/);
    await pulsar("Add a passkey");
    await act(async () => {
      await Promise.resolve();
    });
    assert.equal(llamadas, 1);
    assert.match(texto(), /Passkey added\. On another device, sign in to Hyto and choose Use passkey/);
    assert.equal(document.querySelector("button"), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("la tarjeta de Cuenta en español usa tuteo y el nombre del botón del navegador", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(PasskeyCuenta, {
          agregar: async () => {
            throw new Error(AVISO_PASSKEY_SIN_CLAVE);
          },
        }),
      }),
    );
    assert.match(texto(), /Agrega una llave de acceso para no perder tu cuenta/);
    assert.match(texto(), /Usar un teléfono o una tablet/);
    assert.doesNotMatch(texto(), /Agregá|Use a phone or tablet|\bpasskey\b/i);
    await pulsar("Agregar llave de acceso");
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /Crear llave de acceso/);
    assert.match(texto(), /Usar un teléfono o una tablet/);
    assert.match(texto(), /computadora portátil/);
    assert.match(texto(), /Usar llave de acceso/);
    assert.doesNotMatch(texto(), /Create passkey|Use passkey|Use a phone or tablet|\blaptop\b|\bpasskey\b/i);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("la tarjeta de Cuenta explica para qué sirve y se resalta al llegar desde el enlace de la guía", async () => {
  limpiarPantalla();
  window.history.replaceState(null, "", "/cuentas?add=passkey");
  try {
    await montar(createElement(PasskeyCuenta, { agregar: async () => undefined }));
    const tarjeta = document.getElementById("passkey");
    assert.ok(tarjeta);
    assert.match(tarjeta.className, /is-resaltada/);
    assert.match(texto(), /Start here/);
    assert.match(texto(), /so your phone or another browser can use this account/);
    assert.match(texto(), /Use a phone or tablet/);
    await desmontar();
    window.history.replaceState(null, "", "/cuentas");
    await montar(createElement(PasskeyCuenta, { agregar: async () => undefined }));
    assert.doesNotMatch(document.getElementById("passkey")?.className ?? "", /is-resaltada/);
    assert.doesNotMatch(texto(), /Start here/);
  } finally {
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});

test("sin la clave, la tarjeta de Cuenta guía paso a paso al navegador donde se creó la cuenta", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(PasskeyCuenta, {
        agregar: async () => {
          throw new Error(AVISO_PASSKEY_SIN_CLAVE);
        },
      }),
    );
    await pulsar("Add a passkey");
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /This browser doesn't have your account key, so it can't add a passkey here/);
    assert.match(texto(), /Open Account where you signed up/);
    assert.match(texto(), /localhost\/account/);
    assert.match(texto(), /Tap Add a passkey, then Create passkey/);
    assert.match(texto(), /Use a phone or tablet/);
    assert.match(texto(), /open Events and tap Get ready to be paid/);
    assert.match(texto(), /Don't remember where you signed up\?/);
    assert.equal(document.querySelectorAll(".hyto-guia-paso").length, 4);
    const botones = [...document.querySelectorAll("button")].map((boton) => boton.textContent);
    assert.ok(botones.includes("Copy link"));
    assert.ok(!botones.includes("Add a passkey"));
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("la tarjeta de Cuenta deja intentar de nuevo cuando el fallo no es la falta de clave", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(PasskeyCuenta, {
        agregar: async () => {
          throw new Error(AVISO_PASSKEY_FALLO);
        },
      }),
    );
    await pulsar("Add a passkey");
    await act(async () => {
      await Promise.resolve();
    });
    assert.match(texto(), /We couldn't add the passkey\. Try again\./);
    assert.doesNotMatch(texto(), /Set up this device/);
    assert.ok(document.querySelector("button"));
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
