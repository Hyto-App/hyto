import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("app/globals.css", "utf8");

function regla(selector: string): string {
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Every top-level block for the selector, joined: .hyto-tarea also names the task card in lists.
  const bloques = [...css.matchAll(new RegExp(`(^|\\n)${escapado} \\{([^}]*)\\}`, "g"))].map((bloque) => bloque[2]);
  assert.ok(bloques.length > 0, selector);
  return bloques.join("\n");
}

// At 360–430 px a grid with an auto column grows to its widest unwrapped line (the one-line Mile note),
// and the whole task page scrolled sideways. Its columns must be allowed to shrink.
test("la tarea no se desborda en un teléfono: sus columnas pueden encogerse", () => {
  assert.match(regla(".hyto-tarea"), /grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(regla(".hyto-tarea-cols,\n.hyto-tarea-col"), /grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(regla(".hyto-panel-mile-nota"), /min-width: 0;/);
  assert.match(regla(".hyto-panel-mile-nota"), /flex: 1 1 auto;/);
  assert.match(css, /@media \(max-width: 1023px\) \{[^@]*\.hyto-chip-monto \{[^}]*max-width: 100%;[^}]*white-space: normal;/);
  // Desktop keeps its two columns.
  assert.match(css, /@media \(min-width: 1024px\) \{[^@]*\.hyto-tarea-cols \{\s*grid-template-columns: minmax\(0, 1\.5fr\) minmax\(320px, 1fr\);/);
});
