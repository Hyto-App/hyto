import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { Checklist } from "../../components/integrante/evidencia/Checklist";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

test("los puntos de la tarea de ejemplo se leen en el idioma de la pantalla", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(Checklist, { condicion: "Table set up at the entrance" }) }));
    assert.match(texto(), /Mesa armada en la entrada/);
    assert.doesNotMatch(texto(), /Table set up/);
    await montar(createElement(ProveedorIdioma, { idioma: "en", children: createElement(Checklist, { condicion: "Mesa armada en la entrada" }) }));
    assert.match(texto(), /Table set up at the entrance/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
