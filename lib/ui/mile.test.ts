import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Mile } from "@/components/ui/Mile";
import { ALIAS_MILE, ALCANCE_OJOS, ESTADOS_MILE, conDetalle, desplazarOjos, estadoMile } from "./mile";

test("Mile has seven states and the chest names map to them", () => {
  assert.equal(ESTADOS_MILE.length, 7);
  assert.equal(estadoMile("buscando"), "leyendo");
  assert.equal(estadoMile("la-tengo"), "listo");
  assert.equal(estadoMile("rechazado"), "preocupada");
  assert.equal(estadoMile("descansando"), "reposo");
  assert.equal(estadoMile("cara-feliz"), "celebrando");
  for (const destino of Object.values(ALIAS_MILE)) assert.ok((ESTADOS_MILE as readonly string[]).includes(destino), destino);
});

test("Mile is an inline SVG per state, not an image", () => {
  for (const estado of ESTADOS_MILE) {
    const html = renderToStaticMarkup(createElement(Mile, { estado, tamano: 120 }));
    assert.ok(html.includes("<svg"), estado);
    assert.ok(!html.includes("<img"), estado);
    assert.ok(html.includes(`data-mile="${estado}"`), estado);
    assert.ok(html.includes("aria-hidden"), `${estado} is decorative without a label`);
  }
});

test("only recomendando shows the mouth and the layers carry no fixed ids", () => {
  const css = readFileSync(new URL("../../components/ui/mile.css", import.meta.url), "utf8");
  assert.match(css, /\[data-mile="recomendando"\] \.mile-boca/);
  assert.equal((css.match(/\.mile-boca/g) ?? []).length, 2);
  const html = renderToStaticMarkup(createElement(Mile, { estado: "recomendando" }));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 3);
  for (const id of ids) assert.notEqual(id, "destello");
});

test("two Mile instances never share an id", () => {
  const html = renderToStaticMarkup(createElement("div", null, createElement(Mile, { estado: "reposo" }), createElement(Mile, { estado: "listo" })));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test("light theme gets the dark outline and reduced motion drops the loops", () => {
  const css = readFileSync(new URL("../../components/ui/mile.css", import.meta.url), "utf8");
  assert.match(css, /:root:not\(\[data-theme="dark"\]\) \.hyto-mile \.mile \{\s*--mile-contorno: #14162b/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("a label makes Mile accessible and sizes under 24px are raised", () => {
  const html = renderToStaticMarkup(createElement(Mile, { estado: "buscando", etiqueta: true, tamano: 10 }));
  assert.ok(html.includes('aria-label="Mile is checking your evidence"'));
  assert.ok(html.includes('role="img"'));
  assert.ok(html.includes("width:24px"));
});

test("small sizes hide the sparkle and the shadow", () => {
  assert.equal(conDetalle(55), false);
  assert.equal(conDetalle(56), true);
  assert.ok(!renderToStaticMarkup(createElement(Mile, { estado: "reposo", tamano: 32 })).includes("mile-destello"));
  assert.ok(renderToStaticMarkup(createElement(Mile, { estado: "reposo", tamano: 96 })).includes("mile-destello"));
});

test("the eyes follow the cursor up to 10 units", () => {
  assert.deepEqual(desplazarOjos(0, 0), { x: 0, y: 0 });
  const lejos = desplazarOjos(900, 0);
  assert.equal(lejos.x, ALCANCE_OJOS);
  assert.equal(lejos.y, 0);
  assert.ok(Math.hypot(desplazarOjos(30, 40).x, desplazarOjos(30, 40).y) < ALCANCE_OJOS);
});
