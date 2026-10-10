import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment } from "react";
import { EtiquetasNota, MotivoNota } from "../../components/admin/EtiquetasNota";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import type { EtiquetaNota } from "../revision/razones";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

const etiquetas: EtiquetaNota[] = [
  {
    id: "part_missing",
    texto: "Part of the request missing",
    explicacion: "The answers say part of what was requested is missing or only partly shown.",
    severidad: "warning",
    preguntas: [],
  },
  { id: "finished", texto: "Finished", explicacion: "The answers say the work is finished.", severidad: "good", preguntas: [] },
];

test("en la revisión, «Falta parte de lo pedido» sale una sola vez junto al porcentaje", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(
          Fragment,
          null,
          createElement(MotivoNota, { etiquetas }),
          createElement(EtiquetasNota, { etiquetas, conMotivo: true }),
        ),
      }),
    );
    assert.equal((texto().match(/Falta parte de lo pedido/g) ?? []).length, 1);
    assert.match(texto(), /Las respuestas dicen que falta parte de lo pedido/);
    assert.match(texto(), /Terminado/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
