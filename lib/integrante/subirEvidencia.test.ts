import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

if (typeof URL.createObjectURL !== "function") {
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: () => "blob:foto" });
}
if (typeof URL.revokeObjectURL !== "function") {
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: () => undefined });
}

function definirCamara(getUserMedia: ((restricciones?: unknown) => Promise<MediaStream>) | undefined) {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: getUserMedia ? { getUserMedia } : undefined,
  });
}

async function montarTarea() {
  const fetchPrevio = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "voluntario",
        children: createElement(SubirEvidencia, { tareaId: "stand" }),
      }),
    );
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
  } finally {
    globalThis.fetch = fetchPrevio;
  }
}

function inputArchivo(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error("Sin input de archivo.");
  return input;
}

function boton(etiqueta: string): HTMLButtonElement {
  const encontrado = [...document.querySelectorAll("button")].find((item) => item.textContent === etiqueta);
  if (!(encontrado instanceof HTMLButtonElement)) throw new Error(`Sin botón ${etiqueta}.`);
  return encontrado;
}

async function elegir(archivo: File) {
  const input = inputArchivo();
  Object.defineProperty(input, "files", {
    configurable: true,
    value: { 0: archivo, length: 1, item: () => archivo },
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

test("con cámara en vivo no abre la galería", async () => {
  limpiarPantalla();
  const pedidos: unknown[] = [];
  let clicks = 0;
  const clickPrevio = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function click() {
    clicks += 1;
    return clickPrevio.apply(this);
  };
  const media = document.defaultView!.HTMLMediaElement.prototype;
  const srcPrevio = Object.getOwnPropertyDescriptor(media, "srcObject");
  const playPrevio = media.play;
  Object.defineProperty(media, "srcObject", {
    configurable: true,
    enumerable: true,
    get() {
      return null;
    },
    set() {},
  });
  media.play = function play() {
    return Promise.resolve();
  };
  definirCamara(async (restricciones) => {
    pedidos.push(restricciones);
    return { getTracks: () => [{ stop() {} }] } as MediaStream;
  });
  try {
    await montarTarea();
    assert.match(texto(), /Open camera/);
    assert.match(texto(), /Photos from the gallery are not accepted/);
    assert.doesNotMatch(texto(), /Choose photo/);
    const input = inputArchivo();
    assert.equal(input.disabled, true);
    assert.equal(input.getAttribute("capture"), "environment");
    assert.equal(input.getAttribute("accept"), "image/*");
    await act(async () => {
      boton("Open camera").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(clicks, 0);
    assert.equal(pedidos.length, 1);
    assert.deepEqual(pedidos[0], { audio: false, video: { facingMode: { ideal: "environment" } } });
    assert.equal(document.querySelector('video[aria-label="Camera preview"]')?.tagName, "VIDEO");
    assert.equal(boton("Take photo").textContent, "Take photo");
    assert.doesNotMatch(texto(), /Choose photo/);
  } finally {
    if (srcPrevio) Object.defineProperty(media, "srcObject", srcPrevio);
    media.play = playPrevio;
    HTMLInputElement.prototype.click = clickPrevio;
    await desmontar();
    limpiarPantalla();
  }
});

test("si la cámara falla no ofrece elegir un archivo", async () => {
  limpiarPantalla();
  let clicks = 0;
  const clickPrevio = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function click() {
    clicks += 1;
    return clickPrevio.apply(this);
  };
  definirCamara(async () => {
    throw new Error("denied");
  });
  try {
    await montarTarea();
    await act(async () => {
      boton("Open camera").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(clicks, 0);
    assert.equal(inputArchivo().disabled, true);
    assert.match(texto(), /Allow the camera and try again/);
    assert.doesNotMatch(texto(), /Choose photo/);
  } finally {
    HTMLInputElement.prototype.click = clickPrevio;
    await desmontar();
    limpiarPantalla();
  }
});

test("sin getUserMedia el archivo viejo se rechaza y uno recién tomado sigue", async () => {
  limpiarPantalla();
  definirCamara(undefined);
  let clicks = 0;
  const clickPrevio = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function click() {
    clicks += 1;
    return clickPrevio.apply(this);
  };
  try {
    await montarTarea();
    const input = inputArchivo();
    assert.equal(input.disabled, false);
    assert.equal(input.getAttribute("capture"), "environment");
    await act(async () => {
      boton("Open camera").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(clicks, 1);

    await elegir(new File([Uint8Array.from([1, 2, 3])], "vieja.jpg", { type: "image/jpeg", lastModified: Date.now() - 60 * 60 * 1000 }));
    assert.match(texto(), /Photos from the gallery are not accepted/);
    assert.equal(document.querySelector('img[alt="Evidence"]'), null);

    await elegir(new File([Uint8Array.from([1, 2, 3])], "ahora.jpg", { type: "image/jpeg", lastModified: Date.now() }));
    assert.ok(document.querySelector('img[alt="Evidence"]'));
    assert.equal(boton("Send").textContent, "Send");
  } finally {
    HTMLInputElement.prototype.click = clickPrevio;
    await desmontar();
    limpiarPantalla();
  }
});
