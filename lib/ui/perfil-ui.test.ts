import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { EditorPerfil } from "@/components/perfil/Editor";
import { FichaVoluntario } from "@/components/perfil/Ficha";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

const original = globalThis.fetch;

test("la cuenta deja elegir etiquetas y la ficha las muestra sin puntaje", async () => {
  limpiarPantalla();
  globalThis.fetch = (async () => Response.json({ perfil: { experiencia: "Cocina", etiquetas: ["equipo"] } })) as typeof fetch;
  try {
    await montar(createElement(EditorPerfil), { push: () => undefined });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
    assert.match(texto(), /Nobody rates you/);
    assert.match(texto(), /teamwork/);
    assert.equal(document.querySelectorAll("input[name=etiqueta]").length, 8);
    assert.match(texto(), /no score/);
    assert.equal(document.querySelector("input[type=range]"), null);
    await desmontar();
    await montar(createElement(FichaVoluntario, { ficha: { experiencia: "Cocina", etiquetas: ["equipo", "puntual"] } }));
    assert.match(texto(), /Cocina/);
    assert.match(texto(), /teamwork/);
    assert.match(texto(), /on time/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
