import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Landing } from "../../components/admin/Landing";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

test("la landing cubre el checklist: CTA, pasos, FAQ, equipo, contacto y sin reseñas", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(Landing, { demoHabilitado: false }));
    await act(async () => {
      await Promise.resolve();
    });
    const cuerpo = texto();
    for (const frase of [
      "Proof before",
      "How it works",
      "Lock the funding",
      "First payment on the practice network",
      "Who builds Hyto",
      "Josué",
      "Sebas",
      "Esteban",
      "Abdiel",
      "Raúl",
      "How much does Hyto cost?",
      "Who approves a payment?",
      "Does Hyto keep the funds?",
      "Josué confirma el tiempo",
      "Write to us",
      "Create a free account",
    ]) {
      assert.ok(cuerpo.includes(frase), frase);
    }
    assert.equal(/testimonial|★★★★★|5 stars|loved by|customers say/i.test(cuerpo), false);
    assert.equal(/\bplata\b/i.test(cuerpo), false);
    assert.equal(document.querySelector("main.hyto-landing") !== null, true);
    assert.equal(document.querySelector(".hyto-landing-cta-principal") !== null, true);
    // Sticky CTA mounts only after the hero button leaves the viewport.
    assert.equal(document.querySelector("[data-cta-fijo]"), null);
    assert.equal(document.querySelector("#como-funciona") !== null, true);
    assert.equal(document.querySelector("#faq") !== null, true);
    assert.equal(document.querySelector("#contacto") !== null, true);
    assert.equal(document.querySelector("#equipo") !== null, true);
    assert.equal(document.querySelectorAll(".hyto-equipo-card").length, 5);
    assert.ok(document.querySelectorAll(".hyto-faq").length >= 5);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("la landing y el CTA fijo respetan safe-area en CSS", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.hyto-cta-fijo/);
  assert.match(css, /\.hyto-landing \{[^}]*padding-bottom:\s*calc\(5\.5rem \+ env\(safe-area-inset-bottom/s);
});
