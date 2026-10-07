import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { Checklist } from "@/components/integrante/evidencia/Checklist";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { desmontar, montar, texto } from "../../tests/integracion/montar";

test("la lista de requisitos traduce una condición guardada en español al inglés", async () => {
  await montar(createElement(Checklist, { condicion: "Banner visible y mesa armada" }));
  assert.match(texto(), /Banner visible and the table set up/);
  assert.equal(texto().includes("mesa armada"), false);
  await desmontar();
});

test("la lista de requisitos sigue el idioma elegido y deja intacto un texto propio", async () => {
  await montar(
    createElement(ProveedorIdioma, {
      idioma: "es",
      children: createElement(Checklist, { condicion: "Banner visible and the table set up; Front door" }),
    }),
  );
  assert.match(texto(), /Banner visible y mesa armada/);
  assert.match(texto(), /Front door/);
  await desmontar();
});
