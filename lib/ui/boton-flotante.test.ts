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
  const mile = bloque(telefono, ".hyto-preguntar.hyto-preguntar-icono {", ".hyto-brand-acciones .hyto-perfil-boton.is-compacto {");
  assert.match(mile, /position:\s*fixed/);
  assert.match(mile, /right:\s*16px/);
  assert.match(mile, /bottom:\s*calc\(var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px\)/);
  const perfil = bloque(telefono, ".hyto-brand-acciones .hyto-perfil-boton.is-compacto {", ".hyto-btn,");
  assert.match(perfil, /position:\s*fixed/);
  assert.match(perfil, /right:\s*16px/);
  assert.match(perfil, /bottom:\s*calc\(var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px \+ 40px \+ 16px\)/);
  const main = bloque(telefono, ".hyto-main {", ".hyto-preguntar.hyto-preguntar-icono {");
  assert.match(main, /padding:[^;]*var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px \+ 40px \+ 16px \+ 40px \+ 16px/);
  const escritorio = bloque(css, "@media (min-width: 1024px) {\n  .hyto-shell {", ".hyto-split {");
  assert.doesNotMatch(escritorio, /\.hyto-preguntar\.hyto-preguntar-icono\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(escritorio, /\.hyto-perfil-boton\.is-compacto\s*\{[^}]*position:\s*fixed/);
});
