import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { Unirse } from "@/components/admin/Unirse";
import { desmontar, limpiarPantalla, montar } from "../../tests/integracion/montar";

test("el código del evento se confirma con Enter", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(Unirse), { push: () => undefined });
    const formulario = document.querySelector("form");
    assert.ok(formulario);
    const campo = formulario.querySelector("#codigo-join");
    assert.ok(campo instanceof HTMLInputElement);
    assert.equal(campo.getAttribute("autocomplete"), "off");
    const boton = formulario.querySelector("button");
    assert.equal(boton?.getAttribute("type"), "submit");
    assert.equal(boton?.textContent?.includes("Join"), true);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
