import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { TituloDocumento } from "../../components/ui/TituloDocumento";
import { ProveedorIdioma, SelectorIdioma } from "../../components/ui/Idioma";
import { desmontar, limpiarPantalla, montar, pulsar } from "../../tests/integracion/montar";
import { claveDeRuta, tituloDePestana } from "./tituloRuta";

test("las rutas de la app tienen título en los dos idiomas", () => {
  assert.equal(claveDeRuta("/mis-tareas"), "titulos.tasks");
  assert.equal(claveDeRuta("/eventos"), "titulos.events");
  assert.equal(claveDeRuta("/eventos/"), "titulos.events");
  assert.equal(claveDeRuta("/eventos/nuevo"), "titulos.newEvent");
  assert.equal(claveDeRuta("/tareas/abc"), "titulos.task");
  assert.equal(claveDeRuta("/tareas/abc/recibo"), "titulos.receipt");
  assert.equal(claveDeRuta("/revision/abc"), "titulos.review");
  assert.equal(claveDeRuta("/eventos/abc"), "titulos.event");
  assert.equal(claveDeRuta("/eventos/abc/tareas"), "titulos.assign");
  assert.equal(claveDeRuta("/"), null);
  assert.equal(tituloDePestana("Tasks"), "Tasks · Hyto");
  assert.equal(tituloDePestana("Tareas"), "Tareas · Hyto");
});

test("el título de la pestaña sigue el idioma en vivo", async () => {
  limpiarPantalla();
  document.title = "Tasks · Hyto";
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "en",
        children: createElement("div", null, createElement(TituloDocumento), createElement(SelectorIdioma)),
      }),
      { ruta: "/mis-tareas" },
    );
    assert.equal(document.title, "Tasks · Hyto");
    await pulsar("ES");
    assert.equal(document.title, "Tareas · Hyto");
    await pulsar("EN");
    assert.equal(document.title, "Tasks · Hyto");

    await desmontar();
    document.title = "Hyto · Entrar";
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(TituloDocumento) }), { ruta: "/" });
    assert.equal(document.title, "Hyto · Entrar");

    await desmontar();
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(TituloDocumento) }), { ruta: "/eventos" });
    assert.equal(document.title, "Eventos · Hyto");
    await desmontar();
    await montar(createElement(ProveedorIdioma, { idioma: "en", children: createElement(TituloDocumento) }), { ruta: "/eventos" });
    assert.equal(document.title, "Events · Hyto");
    await desmontar();
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(TituloDocumento) }), { ruta: "/tareas/abc" });
    assert.equal(document.title, "Tarea · Hyto");
    await desmontar();
    await montar(createElement(ProveedorIdioma, { idioma: "en", children: createElement(TituloDocumento) }), { ruta: "/revision/abc" });
    assert.equal(document.title, "Review evidence · Hyto");
  } finally {
    await desmontar();
    limpiarPantalla();
    document.title = "";
  }
});
