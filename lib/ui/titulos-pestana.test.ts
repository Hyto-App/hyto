import assert from "node:assert/strict";
import test from "node:test";
import { texto } from "./diccionario";
import { claveDeRuta, tituloDePestana } from "./tituloRuta";

test("las pestañas dicen Proyectos, Configuración y Nuevo proyecto en español, y siguen en inglés en EN", () => {
  const pestana = (ruta: string, idioma: "es" | "en") => tituloDePestana(texto(idioma, claveDeRuta(ruta)!));
  assert.equal(pestana("/eventos", "es"), "Proyectos · Hyto");
  assert.equal(pestana("/configuracion", "es"), "Configuración · Hyto");
  assert.equal(pestana("/eventos/nuevo", "es"), "Nuevo proyecto · Hyto");
  assert.equal(pestana("/eventos", "en"), "Projects · Hyto");
  assert.equal(pestana("/configuracion", "en"), "Settings · Hyto");
  assert.equal(pestana("/eventos/nuevo", "en"), "New project · Hyto");
});
