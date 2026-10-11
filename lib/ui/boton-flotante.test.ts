import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function bloque(css: string, marca: string, hasta: string): string {
  const inicio = css.indexOf(marca);
  const fin = css.indexOf(hasta, inicio + marca.length);
  assert.ok(inicio >= 0, marca);
  return css.slice(inicio, fin === -1 ? undefined : fin);
}

test("en 390 Mile queda sobre la barra y la lista deja libre la última tarjeta", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const telefono = bloque(css, "@media (max-width: 1023px) {\n  .hyto-shell {", "@media (min-width: 1024px)");
  const mile = bloque(telefono, ".hyto-preguntar.hyto-preguntar-icono {", ".hyto-btn,");
  assert.match(mile, /position:\s*fixed/);
  assert.match(mile, /right:\s*16px/);
  assert.match(mile, /bottom:\s*calc\(var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px\)/);
  assert.doesNotMatch(telefono, /\.hyto-perfil-boton\.is-compacto\s*\{[^}]*position:\s*fixed/);
  const main = bloque(telefono, ".hyto-main {", ".hyto-preguntar.hyto-preguntar-icono {");
  assert.match(main, /padding:[^;]*var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px \+ 40px \+ 16px\)/);
  const proyecto = readFileSync(new URL("../../components/admin/proyecto.css", import.meta.url), "utf8");
  const lista = bloque(proyecto, ".pj-tlista,", ".pj-trow > .pj-tc-mas");
  assert.match(lista, /padding-bottom:\s*140px/);
  assert.match(lista, /\.pj-lista/);
  const escritorio = bloque(css, "@media (min-width: 1024px) {\n  .hyto-shell {", ".hyto-split {");
  assert.doesNotMatch(escritorio, /\.hyto-preguntar\.hyto-preguntar-icono\s*\{[^}]*position:\s*fixed/);
});
