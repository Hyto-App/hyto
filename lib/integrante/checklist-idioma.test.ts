import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { Checklist } from "../../components/integrante/evidencia/Checklist";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

test("la lista de la foto sale en inglés cuando la condición guardada está en español", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "en",
        children: createElement(Checklist, { condicion: "Lista de quienes llegaron al evento" }),
      }),
    );
    assert.match(texto(), /List of people who arrived/);
    assert.doesNotMatch(texto(), /Lista de quienes llegaron/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("la misma lista sale en español cuando la interfaz está en español", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(Checklist, { condicion: "List of people who arrived" }),
      }),
    );
    assert.match(texto(), /Lista de quienes llegaron al evento/);
    assert.doesNotMatch(texto(), /List of people who arrived/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
