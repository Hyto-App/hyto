import assert from "node:assert/strict";
import test from "node:test";
import { COOKIE_IDIOMA, encabezadoIdioma, hayCookieIdioma, idiomaDe, idiomaDeNavegador, MAX_EDAD_IDIOMA } from "./idioma";

test("only es selects Spanish; anything else stays English", () => {
  assert.equal(idiomaDe("es"), "es");
  assert.equal(idiomaDe("en"), "en");
  assert.equal(idiomaDe("ES"), "en");
  assert.equal(idiomaDe(undefined), "en");
  assert.equal(idiomaDe("fr"), "en");
});

test("the language cookie is readable by the browser and lasts a year", () => {
  const encabezado = encabezadoIdioma("es", true);
  assert.match(encabezado, new RegExp(`^${COOKIE_IDIOMA}=es;`));
  assert.match(encabezado, /Path=\//);
  assert.match(encabezado, /SameSite=Lax/);
  assert.match(encabezado, /Secure/);
  assert.match(encabezado, new RegExp(`Max-Age=${MAX_EDAD_IDIOMA}`));
  assert.equal(encabezadoIdioma("en").includes("Secure"), false);
  assert.equal(encabezado.includes("HttpOnly"), false);
});

test("browser language: es* is Spanish, anything else English", () => {
  assert.equal(idiomaDeNavegador("es-MX,es;q=0.9,en;q=0.8"), "es");
  assert.equal(idiomaDeNavegador("es"), "es");
  assert.equal(idiomaDeNavegador("en-US,es;q=0.9"), "en");
  assert.equal(idiomaDeNavegador("fr-FR"), "en");
  assert.equal(idiomaDeNavegador(null), "en");
  assert.equal(idiomaDeNavegador("esperanto"), "en");
});

test("detects whether the language cookie exists", () => {
  assert.equal(hayCookieIdioma("a=1; hyto_idioma=en"), true);
  assert.equal(hayCookieIdioma("a=1"), false);
});
