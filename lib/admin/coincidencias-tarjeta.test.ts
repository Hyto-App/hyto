import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { EtiquetasNota, MotivoNota } from "@/components/admin/EtiquetasNota";
import type { EtiquetaNota } from "@/lib/revision/razones";
import { desmontar, montar, texto } from "../../tests/integracion/montar";

const ETIQUETAS: EtiquetaNota[] = [
  {
    id: "matches",
    texto: "Matches the request",
    explicacion: "The answers say this is what was requested.",
    severidad: "good",
    preguntas: ["v1"],
  },
  {
    id: "matches-otra",
    texto: "Matches the request",
    explicacion: "The answers say this expense is what was requested.",
    severidad: "good",
    preguntas: ["f1"],
  },
  {
    id: "finished",
    texto: "Finished",
    explicacion: "The answers say the work is finished.",
    severidad: "good",
    preguntas: ["t6"],
  },
];

test("Matches the request sale una sola vez en la tarjeta", async () => {
  await montar(
    createElement(
      "article",
      null,
      createElement(MotivoNota, { etiquetas: ETIQUETAS }),
      createElement(EtiquetasNota, { etiquetas: ETIQUETAS, ocultarMotivo: true }),
    ),
  );
  const veces = texto().split("Matches the request").length - 1;
  assert.equal(veces, 1);
  assert.match(texto(), /Finished/);
  await desmontar();
});
