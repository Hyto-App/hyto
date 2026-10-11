import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { Entrar } from "../../components/admin/Entrar";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

const INTRO = /With your email, through Google or a code|Use Google or your email/;
const CAVOS = /Sign-in by Cavos|Cavos/;

function bloque(css: string, marca: string, hasta: string): string {
  const inicio = css.indexOf(marca);
  const fin = css.indexOf(hasta, inicio + marca.length);
  assert.ok(inicio >= 0, marca);
  return css.slice(inicio, fin === -1 ? undefined : fin);
}

test("en el teléfono el formulario va primero y centrado, y las preguntas quedan después", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const telefono = bloque(
    css,
    "/* Phone login: the form sits centered at the top. The FAQ follows it. */",
    "@media (max-width: 1023px) and (max-height: 900px)",
  );
  const tarjeta = bloque(telefono, ".hyto-login-tarjeta {", ".hyto-login-hero {");
  assert.match(tarjeta, /order:\s*-1/);
  assert.match(tarjeta, /align-self:\s*center/);
  assert.match(telefono, /\.hyto-login-izq\s*\{[^}]*order:\s*1/);
  assert.match(telefono, /justify-content:\s*flex-start/);
  const escritorio = bloque(css, "@media (min-width: 1024px) {\n  .hyto-login {\n    --l-gutter:", "@media (prefers-reduced-motion: reduce)");
  assert.doesNotMatch(escritorio, /\.hyto-login-tarjeta\s*\{[^}]*order:\s*-1/);
});

test("en 1440 el titular y el párrafo van a la izquierda y el formulario queda centrado", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const escritorio = bloque(css, "@media (min-width: 1024px) {\n  .hyto-login {\n    --l-gutter:", "@media (prefers-reduced-motion: reduce)");
  const titulo = bloque(escritorio, ".hyto-login .hyto-login-titulo {", ".hyto-login-sub {");
  const sub = bloque(escritorio, ".hyto-login-sub {", ".hyto-login-como {");
  const tarjeta = bloque(escritorio, ".hyto-login-tarjeta {", ".hyto-login-tarjeta h2 {");
  const h2 = bloque(escritorio, ".hyto-login-tarjeta h2 {", ".hyto-login-pasos {");
  assert.match(titulo, /text-align:\s*left/);
  assert.match(titulo, /margin-inline:\s*0/);
  assert.match(sub, /text-align:\s*left/);
  assert.match(sub, /margin-inline:\s*0/);
  assert.match(tarjeta, /justify-self:\s*center/);
  assert.match(tarjeta, /align-self:\s*center/);
  assert.match(h2, /text-align:\s*center/);
});

test("en claro «Get paid.» va en #5A7D00; el botón y el oscuro siguen en lima", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const claro = bloque(css, '[data-theme="light"] .hyto-login .hyto-login-titulo em {', "[data-theme=\"light\"] .hyto-login-escena");
  assert.match(claro, /color:\s*#5a7d00/);
  const oscuro = bloque(css, ".hyto-login .hyto-login-titulo em {", ".hyto-login-sub {");
  assert.match(oscuro, /color:\s*var\(--l-acento\)/);
  assert.doesNotMatch(oscuro, /#5a7d00/);
  const tokens = bloque(css, ".hyto-login {\n  --l-acento:", ".hyto-login.is-saliendo");
  assert.match(tokens, /--l-acento:\s*#b7ee34/);
  const claroTokens = bloque(css, '[data-theme="light"] .hyto-login {', '[data-theme="light"] .hyto-login .hyto-login-titulo em');
  assert.doesNotMatch(claroTokens, /--l-acento:/);
  const boton = bloque(css, ".hyto-login-btn.is-primario {", ".hyto-login-btn.is-primario:disabled");
  assert.match(boton, /background:\s*var\(--l-acento\)/);
  assert.match(boton, /color:\s*var\(--l-sobre\)/);
});

test("el claro aclara el fondo y baja el remolino negro en 390 y en 1440", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  const claro = bloque(css, '[data-theme="light"] .hyto-login {', '[data-theme="light"] .hyto-login-escena');
  assert.match(claro, /--l-fondo:\s*#f5f6fa/);
  assert.match(claro, /color-scheme:\s*light/);
  const remolino = bloque(css, '[data-theme="light"] .hyto-login-remolino {', "[data-theme=\"light\"] .hyto-login-tarjeta {");
  assert.match(remolino, /opacity:\s*0\.16/);
  const ancho = bloque(
    css,
    '@media (min-width: 1024px) {\n  [data-theme="light"] .hyto-login-escena',
    '[data-theme="light"] .hyto-login-tarjeta {',
  );
  assert.match(ancho, /var\(--l-fondo\)/);
  assert.match(ancho, /var\(--l-velo\)/);
  assert.doesNotMatch(ancho, /#24304a|rgba\(20,\s*22,\s*43/);
});

test("el ingreso no muestra el subtítulo ni la línea de Cavos, y deja las preguntas", async () => {
  limpiarPantalla();
  window.sessionStorage.clear();
  try {
    await montar(createElement(Entrar));
    await pulsar("Sign in");
    const ingreso = texto();
    assert.match(ingreso, /Sign in to Hyto/);
    assert.match(ingreso, /Communities anywhere in the world/);
    assert.match(ingreso, /Before you start/);
    assert.doesNotMatch(ingreso, INTRO);
    assert.doesNotMatch(ingreso, CAVOS);
    const tarjeta = document.querySelector(".hyto-login-tarjeta");
    const faq = document.querySelector(".hyto-login-faq");
    assert.ok(tarjeta);
    assert.ok(faq);
    assert.equal(tarjeta?.querySelector(".hyto-login-lead"), null);
    assert.equal(tarjeta?.querySelector(".hyto-login-legal"), null);
    assert.equal(document.querySelector(".hyto-login-grid")?.contains(faq), true);

    await pulsar("Create account");
    const alta = texto();
    assert.match(alta, /Sign up for Hyto/);
    assert.doesNotMatch(alta, INTRO);
    assert.doesNotMatch(alta, CAVOS);
  } finally {
    window.history.replaceState(null, "", "/");
    await desmontar();
    limpiarPantalla();
  }
});
