import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("configuración y Pregúntale a Mile se ajustan entre 360 y 430px y respetan reduced motion", () => {
  const bloque = css.slice(css.indexOf("Settings and Ask Mile, 360–430px"));
  assert.ok(bloque.includes("@media (max-width: 430px)"));
  assert.match(bloque, /\.hyto-config \.hyto-saldo-linea/);
  assert.match(bloque, /\.hyto-config \.hyto-reciente/);
  assert.match(bloque, /\.hyto-config \.hyto-mes-col/);
  assert.match(bloque, /\.hyto-ayuda-atajos/);
  assert.match(bloque, /env\(safe-area-inset-bottom\)/);
  const quieto = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(quieto, /\.hyto-ayuda \{\s*animation:\s*none/);
});
