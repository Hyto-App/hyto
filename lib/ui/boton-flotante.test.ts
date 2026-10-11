import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function bloque(css: string, marca: string, hasta: string): string {
  const inicio = css.indexOf(marca);
  const fin = css.indexOf(hasta, inicio + marca.length);
  assert.ok(inicio >= 0, marca);
  return css.slice(inicio, fin === -1 ? undefined : fin);
}

test("en el teléfono solo Mile flota, el tema y el avatar se quedan en el encabezado y la lista deja libre la última tarjeta", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const telefono = bloque(css, "@media (max-width: 1023px) {\n  .hyto-shell {", "@media (min-width: 1024px)");
  assert.match(telefono, /--pila-1:\s*calc\(var\(--alto-nav\) \+ env\(safe-area-inset-bottom\) \+ 16px\)/);
  assert.doesNotMatch(telefono, /--pila-2:/);
  assert.doesNotMatch(telefono, /--pila-3:/);
  const side = bloque(telefono, ".hyto-side {", ".hyto-nav.hyto-nav-escritorio");
  assert.match(side, /display:\s*flex/);
  assert.doesNotMatch(side, /display:\s*contents/);
  const quietos = bloque(telefono, ".hyto-brand-acciones.hyto-solo-movil .hyto-tema,", ".hyto-preguntar.hyto-preguntar-icono {");
  assert.match(quietos, /position:\s*static/);
  assert.doesNotMatch(quietos, /position:\s*fixed/);
  const mile = bloque(telefono, ".hyto-preguntar.hyto-preguntar-icono {", ".hyto-btn,");
  assert.match(mile, /position:\s*fixed/);
  assert.match(mile, /right:\s*16px/);
  assert.match(mile, /bottom:\s*var\(--pila-1\)/);
  assert.doesNotMatch(mile, /top:\s*50%/);
  const main = bloque(telefono, ".hyto-main {", ".hyto-brand-acciones.hyto-solo-movil .hyto-tema,");
  assert.match(main, /padding:[^;]*var\(--pila-1\) \+ 40px \+ 16px\)/);
  assert.doesNotMatch(main, /padding-right:\s*calc\(16px \+ 40px \+ 16px\)/);
  assert.doesNotMatch(telefono, /\.hyto-brand-acciones \.hyto-tema\s*\{/);
  assert.doesNotMatch(telefono, /\.hyto-idioma[\w-]*\s*\{[^}]*position:\s*fixed/);
  const foot = bloque(telefono, ".hyto-foot-escritorio {", "}");
  assert.match(foot, /display:\s*none/);
  assert.doesNotMatch(foot, /position:\s*fixed/);
  const foco = bloque(telefono, ".hyto-shell-foco .hyto-main {", "}");
  assert.match(foco, /padding-bottom:\s*calc\(140px \+ env\(safe-area-inset-bottom\)\)/);
  assert.doesNotMatch(foco, /padding-right:/);
  assert.doesNotMatch(css, /bottom:\s*calc\(var\(--pila-2\)/);
  const proyecto = readFileSync(new URL("../../components/admin/proyecto.css", import.meta.url), "utf8");
  const lista = bloque(proyecto, ".pj-tlista,", ".pj-trow > .pj-tc-mas");
  assert.match(lista, /padding-bottom:\s*140px/);
  assert.match(lista, /\.pj-lista/);
  const escritorio = bloque(css, "@media (min-width: 1024px) {\n  .hyto-shell {", ".hyto-split {");
  assert.doesNotMatch(escritorio, /\.hyto-preguntar\.hyto-preguntar-icono\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(escritorio, /\.hyto-perfil-boton\.is-compacto\s*\{[^}]*position:\s*fixed/);
  assert.doesNotMatch(escritorio, /\.hyto-brand-acciones \.hyto-tema\s*\{[^}]*position:\s*fixed/);
});
