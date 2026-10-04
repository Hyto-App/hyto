import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Landing } from "../../components/admin/Landing";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

test("la landing explica el producto y se puede recorrer", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(Landing, { demoHabilitado: true }));
    await act(async () => {
      await Promise.resolve();
    });
    const cuerpo = texto();
    const orden = [
      "Prove your worth,",
      "A marketplace of small tasks. You get paid in dollars in crypto (USDC).",
      "Practice network.",
      "not real cash",
      "How it works",
      "Pick a task",
      "Who it is for",
      "Volunteers and workers",
      "Organizers",
      "set the money aside",
      "Meet Mile",
      "The AI only suggests",
      "Do I need to know crypto?",
      "Ready to prove your worth?",
    ];
    let cursor = -1;
    for (const frase of orden) {
      const en = cuerpo.indexOf(frase);
      assert.ok(en > cursor, frase);
      cursor = en;
    }
    assert.deepEqual(
      [...document.querySelectorAll("h3")].map((nodo) => nodo.textContent),
      ["Pick a task", "Send a photo", "Get paid", "Volunteers and workers", "Organizers"],
    );
    assert.equal([...document.querySelectorAll("button")].filter((boton) => boton.textContent?.includes("Sign in")).length, 2);
    const tema = document.querySelector("button.hyto-tema");
    assert.ok(tema instanceof HTMLButtonElement);
    assert.match(tema.getAttribute("aria-label") ?? "", /Switch to (light|dark) theme/);
    assert.equal(/escrow|trustline|\bxdr\b|soroban/i.test(cuerpo), false);
    assert.equal(document.querySelector("main.hyto-landing") !== null, true);
    assert.equal(document.querySelector(".hyto-landing-hero") !== null, true);
    assert.equal(document.querySelectorAll(".hyto-landing-band").length >= 5, true);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("quien ya entró sigue yendo a eventos, y el tema respeta menos movimiento", () => {
  const pagina = readFileSync(new URL("../../app/(admin)/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /if \(sesion\) redirect\("\/eventos"\)/);
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.hyto-landing \{[^}]*display:\s*flex/s);
});
