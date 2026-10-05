import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

function bloque(selector: string): string {
  const inicio = css.indexOf(selector);
  assert.ok(inicio >= 0, selector);
  const abre = css.indexOf("{", inicio);
  const cierra = css.indexOf("}", abre);
  return css.slice(abre, cierra + 1);
}

test("language and action buttons size to their label", () => {
  for (const selector of [".hyto-idioma button", ".hyto-btn {", ".hyto-btn-line {", ".hyto-btn-danger {", ".hyto-cerrar {", ".hyto-opcion {"]) {
    const regla = bloque(selector);
    assert.equal(regla.includes("text-overflow"), false, selector);
    assert.equal(regla.includes("overflow: hidden"), false, selector);
    assert.equal(regla.includes("white-space: nowrap"), false, selector);
    assert.match(regla, /height:\s*auto/, selector);
    assert.match(regla, /max-width:\s*100%/, selector);
  }
  // Filter chips stay on one line and the row scrolls sideways (redesign spec §4); they must not be clipped.
  const chips = bloque(".hyto-chips button");
  assert.match(chips, /white-space:\s*nowrap/);
  assert.equal(chips.includes("text-overflow"), false);
  assert.equal(chips.includes("overflow: hidden"), false);
  assert.match(chips, /height:\s*auto/);
  assert.match(bloque(".hyto-chips {"), /overflow-x:\s*auto/);
  const idioma = bloque(".hyto-idioma button");
  assert.match(idioma, /min-width:\s*36px/);
  assert.match(idioma, /width:\s*auto/);
  const primario = bloque(".hyto-btn {");
  assert.match(primario, /width:\s*max-content/);
  assert.match(primario, /min-height:\s*44px/);
  assert.equal(/(?<![\w-])height:\s*44px/.test(primario), false);
  assert.equal(/(?<![\w-])height:\s*52px/.test(css), false);
});
