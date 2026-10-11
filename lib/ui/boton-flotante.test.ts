import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function bloque(css: string, marca: string, hasta: string): string {
  const inicio = css.indexOf(marca);
  const fin = css.indexOf(hasta, inicio + marca.length);
  assert.ok(inicio >= 0, marca);
  return css.slice(inicio, fin === -1 ? undefined : fin);
}

// Aang's 390 review: avatar and theme live in the header; only Ask Mile floats (Pao). Cards get 20px on each side.
test("en 390 el avatar y el tema van en el encabezado, solo Mile flota y las tarjetas usan todo el ancho", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const telefono = bloque(css, "@media (max-width: 1023px) {\n  .hyto-shell {", "@media (min-width: 1024px)");
  assert.match(telefono, /--pila-1:\s*calc\(var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px\)/);
  const side = bloque(telefono, ".hyto-side {", ".hyto-nav.hyto-nav-escritorio");
  assert.match(side, /display:\s*flex/);
  assert.doesNotMatch(side, /display:\s*contents/);
  const tema = bloque(telefono, ".hyto-brand-acciones.hyto-solo-movil .hyto-tema {", ".hyto-brand-acciones.hyto-solo-movil .hyto-perfil-boton.is-compacto {");
  const avatar = bloque(telefono, ".hyto-brand-acciones.hyto-solo-movil .hyto-perfil-boton.is-compacto {", ".hyto-preguntar.hyto-preguntar-icono {");
  const mile = bloque(telefono, ".hyto-preguntar.hyto-preguntar-icono {", ".hyto-btn,");
  for (const regla of [tema, avatar]) {
    assert.doesNotMatch(regla, /position:\s*fixed/);
    assert.doesNotMatch(regla, /display:\s*none/);
  }
  assert.match(mile, /position:\s*fixed/);
  assert.match(mile, /right:\s*16px/);
  assert.match(mile, /bottom:\s*var\(--pila-1\)/);
  const main = bloque(telefono, ".hyto-main {", ".hyto-brand-acciones.hyto-solo-movil .hyto-tema {");
  assert.match(main, /padding:\s*var\(--e-1\) var\(--margen-lateral\) calc\(var\(--pila-1\) \+ 40px \+ 16px\)/);
  assert.doesNotMatch(main, /padding-right/);
  assert.doesNotMatch(telefono, /\.hyto-brand-acciones \.hyto-tema\s*\{/);
  assert.doesNotMatch(telefono, /\.hyto-idioma[\w-]*\s*\{[^}]*position:\s*fixed/);
  const foot = bloque(telefono, ".hyto-foot-escritorio {", "}");
  assert.match(foot, /display:\s*none/);
  assert.doesNotMatch(foot, /position:\s*fixed/);
  const foco = bloque(telefono, ".hyto-shell-foco .hyto-main {", "}");
  assert.match(foco, /padding-right:\s*var\(--margen-lateral\)/);
  // No rule at any phone width hides the header controls again.
  assert.doesNotMatch(css, /\.hyto-perfil-boton\.is-compacto[^{]*\{\s*display:\s*none/);
  assert.doesNotMatch(css, /\.hyto-preguntar\.hyto-preguntar-icono[^{]*\{\s*display:\s*none/);
  const menu = bloque(css, "@media (max-width: 1023px) {\n  /* Drops from the header avatar", "}");
  assert.match(menu, /top:\s*calc\(60px \+ env\(safe-area-inset-top\) \+ 8px\)/);
  assert.match(menu, /right:\s*16px/);
  assert.match(menu, /bottom:\s*auto/);
  const proyecto = readFileSync(new URL("../../components/admin/proyecto.css", import.meta.url), "utf8");
  const lista = bloque(proyecto, ".pj-tlista,", ".pj-trow > .pj-tc-mas");
  assert.match(lista, /padding-bottom:\s*140px/);
  assert.match(lista, /\.pj-lista/);
  const escritorio = bloque(css, "@media (min-width: 1024px) {\n  .hyto-shell {", ".hyto-split {");
  assert.doesNotMatch(escritorio, /\.hyto-preguntar\.hyto-preguntar-icono\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(escritorio, /\.hyto-perfil-boton\.is-compacto\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(escritorio, /\.hyto-brand-acciones \.hyto-tema\s*\{[^}]*position:\s*fixed/);
});
