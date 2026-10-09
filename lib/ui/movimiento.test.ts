import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("el gesto de la app usa una curva, hunde el botón y asienta 8 px", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const bloque = css.slice(css.indexOf("App micro-interactions"));
  assert.ok(bloque.length > 0);
  assert.equal(bloque.includes("cubic-bezier"), false);
  assert.equal(bloque.includes("hyto-login"), false);
  assert.match(css, /--hyto-curva:\s*cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
  assert.match(bloque, /transform 100ms var\(--hyto-curva\)/);
  assert.match(bloque, /transform: scale\(0\.98\)/);
  assert.match(bloque, /translateY\(8px\)/);
  assert.match(bloque, /hyto-asienta 350ms var\(--hyto-curva\)/);
  assert.match(bloque, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(bloque, /animation: none !important/);
  assert.match(bloque, /transform: none !important/);
  assert.match(bloque, /filter: brightness\(0\.92\)/);
  assert.match(bloque, /transition-duration: 150ms !important/);
  assert.match(bloque, /transition-property: color, background-color, border-color, opacity, filter !important/);
});
