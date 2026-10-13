import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { act, createElement } from "react";
import { AyudaMile } from "@/components/admin/AyudaMile";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
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
    assert.match(partes[1], /^Mile reviews it\.$/);
    assert.deepEqual(chips(), ["How long does it take?", "What if my evidence is rejected?", "What does it cost to pay a task?"]);
    await escribir(".hyto-ayuda-buscar input", "reimbursement");
    assert.deepEqual(chips(), ["How do I pay a reimbursement?", "How does a reimbursement work?"]);
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

test("en el demo de quien hace tareas, Mile no ofrece preguntas de quien organiza y la búsqueda filtra arriba", async () => {
  limpiarPantalla();
  const restaurar = movimiento(true);
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "voluntario",
        children: createElement(AyudaMile, { abierto: true, alCerrar: () => {}, devolver: null }),
      }),
    );
    const organiza = ["How do I set money aside for a task?", "What does it cost to pay a task?", "How do I pay a reimbursement?", "What if I set money aside and I don't pay?"];
    for (const chip of organiza) assert.equal(chips().includes(chip), false, chip);
    await pulsar("How do I get paid?");
    for (let vuelta = 0; vuelta < 4; vuelta += 1) {
      const siguientes = chips();
      assert.ok(siguientes.length >= 2 && siguientes.length <= 3, siguientes.join(" | "));
      for (const chip of organiza) assert.equal(siguientes.includes(chip), false, chip);
      await pulsar(siguientes[0]);
    }
    await escribir(".hyto-ayuda-buscar input", "reimbursement");
    assert.deepEqual(chips(), ["How does a reimbursement work?"]);
    // Results sit right under the field; the conversation steps aside until the field is empty.
    const resultados = document.querySelector(".hyto-ayuda-chips");
    assert.equal(resultados?.previousElementSibling?.classList.contains("hyto-ayuda-buscar"), true);
    assert.equal(document.querySelector<HTMLElement>(".hyto-ayuda-charla")?.hidden, true);
    await escribir(".hyto-ayuda-buscar input", "");
    assert.equal(document.querySelector<HTMLElement>(".hyto-ayuda-charla")?.hidden, false);
  } finally {
    restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("el mascot del panel es el SVG de Mile y flota, salvo con movimiento reducido", async () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /\.hyto-capa-ayuda \{[^}]*align-items: center;/);
  assert.match(css, /\.hyto-ayuda-cabeza \{[^}]*display: grid;/);
  assert.match(css, /\.hyto-ayuda-chips \{[^}]*justify-content: center;/);
  assert.match(css, /@keyframes hyto-ayuda-mile-flota/);
  assert.match(css, /@keyframes hyto-ayuda-mile-lee/);
  assert.match(css, /\.hyto-ayuda \.mile\[data-mile="leyendo"\] \.mile-raiz \{[^}]*animation: hyto-ayuda-mile-lee/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.hyto-ayuda \.mile-raiz,\s*\.hyto-ayuda \.mile-parpado \{\s*animation: none;/);

  limpiarPantalla();
  const restaurar = movimiento(false);
  try {
    await montar(createElement(AyudaMile, { abierto: true, alCerrar: () => {}, devolver: null }));
    const svg = document.querySelector(".hyto-ayuda-mile svg.mile");
    assert.equal(svg?.getAttribute("data-mile"), "reposo");
    assert.equal(svg?.tagName.toLowerCase(), "svg");
    assert.equal(document.querySelector(".hyto-ayuda-mile img"), null);
    assert.equal(document.querySelector(".hyto-ayuda-charla")?.getAttribute("aria-live"), "polite");
    await pulsar("How long does it take?");
    assert.equal(document.querySelector(".hyto-ayuda-mile svg.mile")?.getAttribute("data-mile"), "leyendo");
    assert.ok(document.querySelector(".hyto-ayuda-escribiendo"));
  } finally {
    restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("el panel de Mile cabe en un teléfono: chips que se parten y el × siempre a la vista", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /\.hyto-ayuda-chip \{[^}]*max-width: 100%;[^}]*overflow-wrap: anywhere;/);
  assert.match(css, /\.hyto-ayuda > \[hidden\] \{\s*display: none;/);
  assert.match(css, /\.hyto-capa-ayuda \.hyto-ayuda-cabeza \{[^}]*position: sticky;/);
});
