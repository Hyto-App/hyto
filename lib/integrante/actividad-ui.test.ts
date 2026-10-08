import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { ActividadTarea } from "../../components/integrante/ActividadTarea";
import { desmontar, limpiarPantalla, montar } from "../../tests/integracion/montar";
import type { Tarea } from "./tipos";

function tarea(parcial: Partial<Tarea>): Tarea {
  return {
    id: "registro",
    proyectoId: "demo",
    titulo: "Check-in list",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "List of people who arrived",
    miembroId: "voluntario",
    walletCobro: "",
    estado: "pendiente",
    prioridad: "normal",
    dificultad: null,
    ...parcial,
  };
}

test("en revisión la barra pinta In review y no Approved", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ActividadTarea, {
        tarea: tarea({
          estado: "en revisión",
          etapa: "enviada_organizador",
          enviadaEn: "2026-10-06T15:04:00.000Z",
          nota: 86,
          veredicto: "cumplió",
        }),
      }),
    );
    const pasos = [...document.querySelectorAll(".hyto-rastreo li")];
    assert.deepEqual(
      pasos.map((paso) => [paso.textContent?.trim(), paso.getAttribute("data-estado")]),
      [
        ["In review", "ahora"],
        ["Payment sent", "despues"],
        ["Paid", "despues"],
      ],
    );
    const pintado = pasos.filter((paso) => paso.getAttribute("data-estado") !== "despues").map((paso) => paso.textContent?.trim());
    assert.deepEqual(pintado, ["In review"]);
    assert.equal(pintado.includes("Approved"), false);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
