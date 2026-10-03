import assert from "node:assert/strict";
import test from "node:test";
import { COOKIE_IDIOMA, encabezadoIdioma, idiomaDe, MAX_EDAD_IDIOMA } from "./idioma";

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
