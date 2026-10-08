import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { TipoCuenta } from "@/components/cuenta/TipoCuenta";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

const original = globalThis.fetch;

test("el formulario deja elegir empresa o voluntario y pide el perfil de empresa", async () => {
  limpiarPantalla();
  globalThis.fetch = (async () => Response.json({ perfil: null })) as typeof fetch;
  try {
    await montar(createElement(TipoCuenta), { push: () => undefined });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
    assert.match(texto(), /Company or organization/);
    assert.match(texto(), /Volunteer/);
    assert.match(texto(), /does not change your role/);
    const empresa = document.querySelector<HTMLInputElement>("input[value=empresa]");
    assert.ok(empresa);
    await act(async () => {
      empresa.click();
    });
    assert.ok(document.querySelector("#empresa-nombre"));
    assert.ok(document.querySelector("#empresa-actividad"));
    assert.ok(document.querySelector("#empresa-descripcion"));
    assert.ok(document.querySelector("#empresa-foto"));
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
