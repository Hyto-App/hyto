import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function bloque(css: string, marca: string, hasta: string): string {
  const inicio = css.indexOf(marca);
  const fin = css.indexOf(hasta, inicio + marca.length);
  assert.ok(inicio >= 0, marca);
  return css.slice(inicio, fin === -1 ? undefined : fin);
}

test("en 390 tema, avatar y Mile comparten una columna y la lista deja libre la última tarjeta", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const telefono = bloque(css, "@media (max-width: 1023px) {\n  .hyto-shell {", "@media (min-width: 1024px)");
  assert.match(telefono, /--pila-1:\s*calc\(var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px\)/);
  assert.match(telefono, /--pila-2:\s*calc\(var\(--pila-1\) \+ 40px \+ 12px\)/);
  assert.match(telefono, /--pila-3:\s*calc\(var\(--pila-2\) \+ 40px \+ 12px\)/);
  const side = bloque(telefono, ".hyto-side {", ".hyto-nav.hyto-nav-escritorio");
  assert.match(side, /display:\s*flex/);
  assert.doesNotMatch(side, /display:\s*contents/);
  const tema = bloque(telefono, ".hyto-brand-acciones.hyto-solo-movil .hyto-tema {", ".hyto-brand-acciones.hyto-solo-movil .hyto-perfil-boton.is-compacto {");
  const avatar = bloque(telefono, ".hyto-brand-acciones.hyto-solo-movil .hyto-perfil-boton.is-compacto {", ".hyto-preguntar.hyto-preguntar-icono {");
  const mile = bloque(telefono, ".hyto-preguntar.hyto-preguntar-icono {", ".hyto-btn,");
  for (const regla of [tema, avatar, mile]) {
    assert.match(regla, /position:\s*fixed/);
    assert.match(regla, /right:\s*16px/);
    assert.doesNotMatch(regla, /top:\s*50%/);
  }
  assert.match(tema, /bottom:\s*var\(--pila-3\)/);
  assert.match(avatar, /bottom:\s*var\(--pila-2\)/);
  assert.match(mile, /bottom:\s*var\(--pila-1\)/);
  const main = bloque(telefono, ".hyto-main {", ".hyto-brand-acciones.hyto-solo-movil .hyto-tema {");
  assert.match(main, /padding:[^;]*var\(--pila-3\) \+ 40px \+ 16px\)/);
  assert.match(main, /padding-right:\s*calc\(16px \+ 40px \+ 16px\)/);
  assert.doesNotMatch(telefono, /\.hyto-brand-acciones \.hyto-tema\s*\{/);
  assert.doesNotMatch(telefono, /\.hyto-idioma[\w-]*\s*\{[^}]*position:\s*fixed/);
  const foot = bloque(telefono, ".hyto-foot-escritorio {", "}");
  assert.match(foot, /display:\s*none/);
  assert.doesNotMatch(foot, /position:\s*fixed/);
  const foco = bloque(telefono, ".hyto-shell-foco .hyto-main {", "}");
  assert.match(foco, /padding-right:\s*var\(--margen-lateral\)/);
  const menu = bloque(css, "@media (max-width: 1023px) {\n  .hyto-perfil-menu {", "}");
  assert.match(menu, /top:\s*auto/);
  assert.match(menu, /right:\s*16px/);
  assert.match(menu, /bottom:\s*calc\(var\(--pila-2\) \+ 40px \+ 8px\)/);
  const proyecto = readFileSync(new URL("../../components/admin/proyecto.css", import.meta.url), "utf8");
  const lista = bloque(proyecto, ".pj-tlista,", ".pj-trow > .pj-tc-mas");
  assert.match(lista, /padding-bottom:\s*140px/);
  assert.match(lista, /\.pj-lista/);
  const escritorio = bloque(css, "@media (min-width: 1024px) {\n  .hyto-shell {", ".hyto-split {");
  assert.doesNotMatch(escritorio, /\.hyto-preguntar\.hyto-preguntar-icono\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(escritorio, /\.hyto-perfil-boton\.is-compacto\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(escritorio, /\.hyto-brand-acciones \.hyto-tema\s*\{[^}]*position:\s*fixed/);
});
