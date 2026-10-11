import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function bloque(css: string, marca: string, hasta: string): string {
  const inicio = css.indexOf(marca);
  const fin = css.indexOf(hasta, inicio + marca.length);
  assert.ok(inicio >= 0, marca);
  return css.slice(inicio, fin === -1 ? undefined : fin);
}

test("en 390 el botón redondo queda a 16 px del borde y 16 px sobre la barra, sin tapar la tarjeta", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const telefono = bloque(css, "@media (max-width: 1023px) {\n  .hyto-shell {", "@media (min-width: 1024px)");
  const boton = bloque(telefono, ".hyto-preguntar.hyto-preguntar-icono {", ".hyto-btn,");
  assert.match(boton, /position:\s*fixed/);
  assert.match(boton, /right:\s*16px/);
  assert.match(boton, /bottom:\s*calc\(var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px\)/);
  const main = bloque(telefono, ".hyto-main {", ".hyto-btn,");
  assert.match(main, /padding:[^;]*var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px \+ 40px \+ 16px/);
  const escritorio = bloque(css, "@media (min-width: 1024px) {\n  .hyto-shell {", ".hyto-split {");
  assert.doesNotMatch(escritorio, /\.hyto-preguntar\.hyto-preguntar-icono\s*\{[^}]*position:\s*fixed/);
});
