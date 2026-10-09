import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { PresentacionMile } from "@/components/admin/PresentacionMile";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { desmontar, montar, texto } from "../../tests/integracion/montar";
import { reiniciarPresentacionMile } from "./mile-presentacion";

test("Mile se presenta una sola vez y en el idioma de la pantalla", async () => {
  reiniciarPresentacionMile();
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement("div", null, createElement(PresentacionMile), createElement(PresentacionMile)),
      }),
    );
    assert.equal(texto(), "Mile (nuestro revisor con IA)");
    await desmontar();
    await montar(createElement(PresentacionMile));
    assert.equal(texto(), "");
  } finally {
    await desmontar();
    reiniciarPresentacionMile();
  }
});
