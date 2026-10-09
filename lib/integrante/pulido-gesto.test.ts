import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";
import { errorSinCamara, listaSinCamara } from "./camaraDispositivo";
import { codigoTelefono } from "./codigoTelefono";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function tarea(extra: Record<string, unknown> = {}) {
  return {
    id: "stand",
    titulo: "Set up the booth",
    tipo: "trabajo",
    monto: "20",
    condicion: "Banner visible",
    miembroId: "voluntario-1",
    estado: "pendiente",
    proyectoId: "zeek",
    ...extra,
  };
}

async function abrir(cuerpo: Record<string, unknown>, demo = false) {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) return json({ tareas: [cuerpo] });
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  await montar(
    createElement(ProveedorModoDemo, {
      activo: demo,
      rol: demo ? "voluntario" : null,
      children: createElement(SubirEvidencia, { tareaId: "stand" }),
    }),
  );
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 30));
  });
}

test("el código del teléfono sale de la tarea y una lista vacía no afirma que no hay cámara", () => {
  assert.equal(codigoTelefono("stand"), "STAND");
  assert.equal(codigoTelefono("ab"), codigoTelefono("ab"));
  assert.equal(listaSinCamara([]), false);
  assert.equal(listaSinCamara([{ kind: "audioinput" }]), true);
  assert.equal(listaSinCamara([{ kind: "videoinput" }]), false);
  assert.equal(errorSinCamara(Object.assign(new Error("no"), { name: "NotFoundError" })), true);
  assert.equal(errorSinCamara(new Error("denied")), false);
});

test("sin cámara se explica y se ofrece el teléfono con código", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        throw new Error("no debe abrir");
      },
      enumerateDevices: async () => [{ kind: "audioinput" }],
    },
  });
  try {
    await abrir(tarea());
    assert.match(texto(), /This device has no camera/);
    assert.match(texto(), /Continue on your phone with this code/);
    assert.match(texto(), /STAND/);
    assert.match(texto(), /The photo is taken here/);
    assert.match(texto(), /Banner visible/);
    assert.equal(document.querySelector('input[type="file"]'), null);
    assert.equal([...document.querySelectorAll("button")].some((item) => item.textContent === "Open camera"), false);
    const seguir = [...document.querySelectorAll("button")].find((item) => item.textContent === "Continue on your phone");
    assert.ok(seguir instanceof HTMLButtonElement);
    await act(async () => {
      seguir.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.match(texto(), /STAND/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("si la cámara no existe al abrirla, el aviso pasa al teléfono", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        throw Object.assign(new Error("missing"), { name: "NotFoundError" });
      },
    },
  });
  try {
    await abrir(tarea());
    const abrirCamara = [...document.querySelectorAll("button")].find((item) => item.textContent === "Open camera");
    assert.ok(abrirCamara instanceof HTMLButtonElement);
    await act(async () => {
      abrirCamara.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.match(texto(), /This device has no camera/);
    assert.match(texto(), /STAND/);
    assert.equal(document.querySelector('input[type="file"]'), null);
    assert.doesNotMatch(texto(), /Allow the camera and try again/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("si la persona no mira, la tengo queda asentada y no repite el gesto", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const previo = Object.getOwnPropertyDescriptor(Document.prototype, "hidden");
  Object.defineProperty(Document.prototype, "hidden", { configurable: true, get: () => true });
  try {
    await abrir(tarea({ estado: "en revisión", nota: 90, veredicto: "cumplió" }));
    const raiz = document.querySelector(".hyto-la-tengo");
    assert.ok(raiz instanceof HTMLElement);
    assert.match(raiz.className, /hyto-asentado/);
    assert.match(texto(), /Your evidence is ready/);
    assert.equal(window.sessionStorage.getItem("hyto-la-tengo:stand"), "1");
  } finally {
    if (previo) Object.defineProperty(Document.prototype, "hidden", previo);
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("al volver, la tengo no vuelve a viajar", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  window.sessionStorage.setItem("hyto-la-tengo:stand", "1");
  try {
    await abrir(tarea({ estado: "en revisión", nota: 90, veredicto: "cumplió" }));
    assert.match(document.querySelector(".hyto-la-tengo")?.className ?? "", /hyto-asentado/);
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 40));
    });
    assert.match(document.querySelector(".hyto-la-tengo")?.className ?? "", /hyto-asentado/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("en la red de práctica el cierre no dice que el dinero ya está en el saldo", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  try {
    await abrir(tarea({ estado: "pagado", nota: 90, veredicto: "cumplió" }), true);
    assert.match(texto(), /No real money moves on this practice network/);
    assert.equal(texto().includes("It's already in your balance"), false);
    assert.equal(document.querySelectorAll("a.hyto-btn").length, 1);
    assert.doesNotMatch(texto(), /You did it|Well done|confetti/i);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
