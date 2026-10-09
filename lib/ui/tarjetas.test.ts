import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { claseBoton } from "@/components/ui/Boton";
import { Identidad } from "@/components/ui/Identidad";
import { FichaVoluntario } from "@/components/perfil/Ficha";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

test("la tarjeta muestra avatar, nombre, rol, etiquetas y el vacío", async () => {
  limpiarPantalla();
  await montar(
    createElement(
      "div",
      null,
      createElement(Identidad, {
        nombre: "North crew",
        rol: "Community",
        detalle: "The people who set up the booth.",
        etiquetas: ["Public"],
        href: "/comunidades/norte",
      }),
      createElement(Identidad, { nombre: "", vacio: "No tags yet." }),
      createElement(FichaVoluntario, { ficha: { experiencia: null, etiquetas: [] }, nombre: "Ana" }),
    ),
  );
  assert.match(texto(), /North crew/);
  assert.match(texto(), /Community/);
  assert.match(texto(), /The people who set up the booth/);
  assert.match(texto(), /Public/);
  assert.match(texto(), /NC/);
  assert.match(texto(), /No tags yet/);
  assert.equal(document.querySelectorAll("a.hyto-identidad").length, 1);
  assert.equal(document.querySelectorAll(".hyto-identidad-vacio").length, 1);
  assert.doesNotMatch(texto(), /Ana/);
  await desmontar();
  limpiarPantalla();
});

test("un botón por variante y el de carga queda ocupado", () => {
  assert.equal(claseBoton("primario"), "hyto-btn");
  assert.equal(claseBoton("secundario"), "hyto-btn-line");
  assert.equal(claseBoton("fantasma"), "hyto-btn-ghost");
  assert.equal(claseBoton("peligro", true), "hyto-btn-danger hyto-btn-grande");
});
