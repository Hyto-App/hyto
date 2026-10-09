import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { act, createElement } from "react";
import { FotoEvidencia } from "@/components/admin/Revision";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { desmontar, montar, pulsar } from "../../tests/integracion/montar";

const SRC = "https://example.test/recibo.png";

function foto(idioma: "en" | "es" = "en", src = SRC) {
  return createElement(ProveedorIdioma, {
    idioma,
    children: createElement(FotoEvidencia, { src, alt: "Team meal" }),
  });
}

function botonFoto(): HTMLButtonElement {
  const nodo = document.querySelector(".hyto-photo-abrir");
  if (!(nodo instanceof HTMLButtonElement)) throw new Error("sin botón de la foto");
  return nodo;
}

function imagenDe(raiz: ParentNode): HTMLImageElement {
  const nodo = raiz.querySelector("img");
  if (!nodo || nodo.nodeName !== "IMG") throw new Error("sin foto");
  return nodo as HTMLImageElement;
}

async function cargar(raiz: ParentNode = document) {
  await act(async () => {
    imagenDe(raiz).dispatchEvent(new Event("load"));
  });
}

function luminancia(hex: string): number {
  const canales = [0, 2, 4].map((indice) => {
    const s = parseInt(hex.slice(indice + 1, indice + 3), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contraste(a: string, b: string): number {
  const [alta, baja] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alta + 0.05) / (baja + 0.05);
}

function variable(css: string, bloque: string, nombre: string): string {
  const inicio = css.indexOf(bloque);
  const fin = css.indexOf("}", inicio);
  const encontrado = css.slice(inicio, fin).match(new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})`));
  if (!encontrado) throw new Error(`sin ${nombre}`);
  return encontrado[1].toLowerCase();
}

test("the review frame keeps its size and the photo uses contain", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const marco = css.slice(css.indexOf(".hyto-photo {"), css.indexOf(".hyto-photo img,"));
  assert.match(marco, /max-height:\s*520px/);
  assert.match(marco, /aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(marco, /overflow:\s*hidden/);
  assert.match(css, /\.hyto-photo img \{\s*object-fit:\s*contain;\s*\}/);
});

test("the photo focus ring sits outside the frame and clears 3:1 on light and dark", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const marco = css.slice(css.indexOf(".hyto-photo {"), css.indexOf(".hyto-photo img,"));
  assert.match(marco, /max-height:\s*520px/);
  assert.match(marco, /aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(marco, /overflow:\s*hidden/);
  const anillo = css.slice(css.indexOf(".hyto-photo:has(.hyto-photo-abrir:focus-visible)"), css.indexOf(".hyto-photo-nota"));
  assert.match(anillo, /outline:\s*3px solid var\(--foco-foto\)/);
  assert.match(anillo, /outline-offset:\s*3px/);
  assert.doesNotMatch(anillo, /outline-offset:\s*-/);
  assert.equal(/\.hyto-photo-abrir:focus-visible\s*\{[^}]*outline:\s*2px/.test(css), false);
  const claro = variable(css, ":root {", "--foco-foto");
  const claroContra = variable(css, ":root {", "--foco-foto-contra");
  const oscuro = variable(css, '[data-theme="dark"] {', "--foco-foto");
  const oscuroContra = variable(css, '[data-theme="dark"] {', "--foco-foto-contra");
  assert.ok(contraste(claro, claroContra) >= 3, `${claro} vs ${claroContra}`);
  assert.ok(contraste(oscuro, oscuroContra) >= 3, `${oscuro} vs ${oscuroContra}`);
  assert.ok(contraste(claro, "#f5f6fa") >= 3);
  assert.ok(contraste(claro, "#ffffff") >= 3);
  assert.ok(contraste(oscuro, "#0e1024") >= 3);
  assert.ok(contraste(oscuro, "#14162b") >= 3);
});

test("the photo says Loading… until it loads, then opens larger from the keyboard", async () => {
  await montar(foto());
  const espera = document.querySelector("[role=status]");
  assert.equal(espera?.textContent, "Loading…");
  assert.equal(espera?.querySelector(".sr-only"), null);
  assert.equal(botonFoto().tabIndex, -1);
  assert.equal(botonFoto().getAttribute("aria-disabled"), "true");
  await act(async () => {
    botonFoto().click();
  });
  assert.equal(document.querySelector("[role=dialog]"), null);

  await cargar();
  const abrir = botonFoto();
  assert.equal(document.querySelector("[role=status]"), null);
  assert.equal(abrir.tabIndex, 0);
  assert.equal(abrir.getAttribute("aria-label"), "View Team meal larger");
  assert.equal(abrir.getAttribute("aria-haspopup"), "dialog");
  await act(async () => {
    abrir.focus();
    abrir.click();
  });
  const dialogo = document.querySelector("[role=dialog]");
  assert.ok(dialogo instanceof HTMLElement);
  assert.equal(dialogo.getAttribute("aria-modal"), "true");
  assert.match(dialogo.textContent ?? "", /Loading…/);
  const cerrar = dialogo.querySelector("button");
  assert.equal(cerrar?.textContent, "Close");
  assert.equal(document.activeElement, cerrar);

  await cargar(dialogo);
  assert.equal(dialogo.querySelector("[role=status]"), null);
  assert.equal(imagenDe(dialogo).alt, "Team meal");
  assert.equal(imagenDe(dialogo).style.opacity, "");

  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  });
  assert.equal(document.activeElement, cerrar);
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  assert.equal(document.querySelector("[role=dialog]"), null);
  assert.equal(document.activeElement, abrir);
  await desmontar();
});

test("a failed photo shows a clear error and the enlarged view can close", async () => {
  await montar(foto());
  await act(async () => {
    imagenDe(document).dispatchEvent(new Event("error"));
  });
  const alerta = document.querySelector("[role=alert]");
  assert.equal(alerta?.textContent, "This photo could not be shown.");
  assert.equal(document.querySelector(".hyto-photo-abrir"), null);
  await desmontar();

  await montar(foto());
  await cargar();
  await act(async () => {
    botonFoto().click();
  });
  const dialogo = document.querySelector("[role=dialog]");
  if (!(dialogo instanceof HTMLElement)) throw new Error("sin vista grande");
  await act(async () => {
    imagenDe(dialogo).dispatchEvent(new Event("error"));
  });
  assert.equal(dialogo.querySelector("[role=alert]")?.textContent, "This photo could not be shown.");
  await pulsar("Close");
  assert.equal(document.querySelector("[role=dialog]"), null);
  await desmontar();
});

test("a photo that failed before React was listening still shows the error", async () => {
  const proto = Object.getPrototypeOf(document.createElement("img")) as { decode: () => Promise<void> };
  const original = proto.decode;
  proto.decode = () => Promise.reject(new Error("fallo"));
  try {
    await montar(foto("en", "https://example.test/rota.png"));
    await act(async () => {
      await Promise.resolve();
    });
    assert.equal(document.querySelector("[role=alert]")?.textContent, "This photo could not be shown.");
    assert.equal(document.querySelector(".hyto-photo-abrir"), null);
  } finally {
    proto.decode = original;
    await desmontar();
  }
});

test("el mismo estado en español", async () => {
  await montar(foto("es"));
  assert.match(document.body.textContent ?? "", /Cargando…/);
  await act(async () => {
    imagenDe(document).dispatchEvent(new Event("error"));
  });
  assert.equal(document.querySelector("[role=alert]")?.textContent, "No se pudo mostrar esta foto.");
  await desmontar();

  await montar(foto("es"));
  await cargar();
  assert.equal(botonFoto().getAttribute("aria-label"), "Ver Team meal más grande");
  await act(async () => {
    botonFoto().click();
  });
  assert.equal(document.querySelector("[role=dialog] button")?.textContent, "Cerrar");
  await desmontar();
});
