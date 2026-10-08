import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { ActividadTarea } from "@/components/integrante/ActividadTarea";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { desmontar, montar, texto } from "../../tests/integracion/montar";
import { tareasEjemplo } from "./ejemplos";
import type { Tarea } from "./tipos";

function pendienteConDatosViejos(): Tarea {
  const registro = tareasEjemplo().find((tarea) => tarea.id === "registro");
  if (!registro) throw new Error("falta registro");
  return {
    ...registro,
    estado: "pendiente",
    etapa: "enviada_organizador",
    enviadaEn: "2026-10-01T18:00:00.000Z",
    nota: 65,
    veredicto: "parcial",
  };
}

test("una tarea pendiente no muestra Approved, el envío del 1 oct ni Mile", async () => {
  await montar(createElement(ActividadTarea, { tarea: pendienteConDatosViejos() }));
  try {
    const plano = texto();
    assert.equal(plano.includes("Approved"), false);
    assert.equal(plano.includes("You sent your evidence"), false);
    assert.equal(plano.includes("Mile reviewed"), false);
    assert.equal(plano.includes("Oct 1"), false);
    assert.match(plano, /After you send the photo, the trail shows up here/);
  } finally {
    await desmontar();
  }
});

test("en español la pendiente queda vacía y el envío real sí aparece", async () => {
  const registro = tareasEjemplo().find((tarea) => tarea.id === "registro");
  if (!registro) throw new Error("falta registro");
  await montar(
    createElement(ProveedorIdioma, {
      idioma: "es",
      children: createElement(ActividadTarea, { tarea: pendienteConDatosViejos() }),
    }),
  );
  try {
    const vacia = texto();
    assert.equal(vacia.includes("Aprobada"), false);
    assert.equal(vacia.includes("Enviaste tu evidencia"), false);
    assert.equal(vacia.includes("Mile revisó"), false);
    assert.match(vacia, /Cuando envíes la foto, el recorrido aparece aquí/);
  } finally {
    await desmontar();
  }

  await montar(
    createElement(ProveedorIdioma, {
      idioma: "es",
      children: createElement(ActividadTarea, {
        tarea: {
          ...registro,
          estado: "en revisión",
          etapa: "enviada_organizador",
          enviadaEn: "2026-10-06T15:04:00.000Z",
          nota: 86,
          veredicto: "cumplió",
        },
      }),
    }),
  );
  try {
    const enviada = texto();
    assert.match(enviada, /Enviaste tu evidencia/);
    assert.match(enviada, /Mile revisó tu evidencia/);
    assert.equal(enviada.includes("Aprobada"), false);
    assert.equal(enviada.includes("Cuando envíes la foto"), false);
  } finally {
    await desmontar();
  }
});
