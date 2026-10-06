import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Mile } from "@/components/ui/Mile";
import { ESTADOS_MILE, conHalo, rutaMile } from "./mile";
import { existsSync } from "node:fs";

test("every state has a dark and a light SVG in public/mile", () => {
  assert.equal(ESTADOS_MILE.length, 7);
  for (const estado of ESTADOS_MILE) {
    for (const tema of ["dark", "light"] as const) {
      assert.ok(existsSync(`public${rutaMile(estado, tema)}`), `${estado} ${tema}`);
    }
  }
});

test("Mile renders both theme images with the right src", () => {
  for (const estado of ESTADOS_MILE) {
    const html = renderToStaticMarkup(createElement(Mile, { estado, tamano: 120 }));
    assert.ok(html.includes(`src="${rutaMile(estado, "dark")}"`), estado);
    assert.ok(html.includes(`src="${rutaMile(estado, "light")}"`), estado);
    assert.ok(html.includes("aria-hidden"), `${estado} is decorative without a label`);
  }
});

test("a label makes Mile accessible and sizes under 24px are raised", () => {
  const html = renderToStaticMarkup(createElement(Mile, { estado: "buscando", etiqueta: true, tamano: 10 }));
  assert.ok(html.includes('alt="Mile is checking your photo"'));
  assert.ok(html.includes("width:24px"));
  assert.ok(!html.includes('aria-hidden="true" class="hyto-mile'));
});

test("halo defaults on from 96px and can be forced", () => {
  assert.equal(conHalo(96), true);
  assert.equal(conHalo(56), false);
  assert.equal(conHalo(56, true), true);
  assert.equal(conHalo(160, false), false);
});
