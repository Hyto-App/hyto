import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { act, createElement } from "react";
import { AyudaMile } from "@/components/admin/AyudaMile";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

function movimiento(reducido: boolean): () => void {
  const anterior = window.matchMedia;
  window.matchMedia = ((consulta: string) => ({
    matches: reducido && consulta.includes("prefers-reduced-motion"),
    media: consulta,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = anterior;
  };
}

function burbujasMile(): string[] {
  const filas = [...document.querySelectorAll(".hyto-ayuda-fila.is-mile")];
  const ultima = filas.at(-1);
  return [...(ultima?.querySelectorAll("p.hyto-ayuda-burbuja") ?? [])].map((p) => p.textContent ?? "");
}

function chips(): string[] {
  return [...document.querySelectorAll(".hyto-ayuda-chip")].map((boton) => boton.textContent ?? "");
}

test("con movimiento reducido la respuesta entra de una, como charla, y ofrece las siguientes", async () => {
  limpiarPantalla();
  const restaurar = movimiento(true);
  let cerrado = 0;
  const origen = document.createElement("button");
  document.body.appendChild(origen);
  try {
    await montar(createElement(AyudaMile, { abierto: true, alCerrar: () => (cerrado += 1), devolver: origen }));
    const charla = document.querySelector(".hyto-ayuda-charla");
    assert.equal(charla?.getAttribute("aria-live"), "polite");
    assert.match(texto(), /Hi, I'm Mile/);
    assert.ok(chips().includes("How do I get paid?"));
    await pulsar("How do I get paid?");
    assert.equal(document.querySelector(".hyto-ayuda-burbuja.is-persona")?.textContent, "You: How do I get paid?");
    assert.equal(document.querySelector(".hyto-ayuda-escribiendo"), null);
    const partes = burbujasMile();
    assert.equal(partes.length, 4);
    assert.match(partes[1], /Mile reviews it in seconds/);
    assert.deepEqual(chips(), ["How long does it take?", "What if my photo is rejected?", "What does it cost to pay a task?"]);
    await escribir(".hyto-ayuda-buscar input", "reimbursement");
    assert.deepEqual(chips(), ["How do I pay a reimbursement?", "What do I send?", "How does a reimbursement work?"]);
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    assert.equal(cerrado, 1);
    await montar(createElement(AyudaMile, { abierto: false, alCerrar: () => {}, devolver: origen }));
    assert.equal(document.activeElement, origen);
  } finally {
    restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("con movimiento Mile escribe antes de cada burbuja", async () => {
  limpiarPantalla();
  const restaurar = movimiento(false);
  try {
    await montar(createElement(AyudaMile, { abierto: true, alCerrar: () => {}, devolver: null }));
    await pulsar("How long does it take?");
    assert.ok(document.querySelector(".hyto-ayuda-escribiendo"));
    assert.match(texto(), /Mile is typing…/);
    assert.deepEqual(burbujasMile(), []);
    assert.deepEqual(chips(), []);
    await act(async () => {
      await new Promise((listo) => setTimeout(listo, 700));
    });
    assert.equal(burbujasMile().length, 1);
    await act(async () => {
      await new Promise((listo) => setTimeout(listo, 1700));
    });
    assert.equal(burbujasMile().length, 3);
    assert.equal(document.querySelector(".hyto-ayuda-escribiendo"), null);
    assert.ok(chips().length >= 2);
  } finally {
    restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("las burbujas usan la curva de Hyto y se quedan quietas con movimiento reducido", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /\.hyto-ayuda-burbuja \{[^}]*animation: hyto-burbuja 200ms var\(--hyto-curva\) backwards/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.hyto-ayuda-burbuja,\s*\.hyto-ayuda-puntos i \{\s*animation: none;/);
});
