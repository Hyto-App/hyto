import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { ActividadTarea } from "@/components/integrante/ActividadTarea";
import { ProveedorIdioma } from "@/components/ui/Idioma";
import { desmontar, montar, texto } from "../../tests/integracion/montar";
import { seguimientoDe } from "./actividad";
import type { Tarea } from "./tipos";

function tarea(cambios: Partial<Tarea> = {}): Tarea {
  return {
    id: "stand",
    proyectoId: "uno",
    titulo: "Booth",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado: "pendiente",
    prioridad: "normal",
    dificultad: null,
    ...cambios,
  };
}

function marcas(): { texto: string; hecho: string; check: string }[] {
  return [...document.querySelectorAll(".hyto-rastreo li")].map((li) => ({
    texto: li.querySelector(".hyto-rastreo-texto")?.textContent ?? "",
    hecho: li.querySelector(".hyto-rastreo-marca")?.getAttribute("data-hecho") ?? "",
    check: li.querySelector(".hyto-rastreo-marca")?.textContent ?? "",
  }));
}

test("sin nada enviado, Actividad solo dice que todavía no hay actividad (EN y ES)", async () => {
  assert.equal(seguimientoDe(tarea()).empezo, false);
  try {
    await montar(createElement(ActividadTarea, { tarea: tarea() }));
    assert.equal(document.querySelector(".hyto-rastreo"), null);
    assert.match(texto(), /No activity yet\. It shows up when you send your evidence\./);
    assert.equal(document.querySelectorAll(".hyto-rastreo-marca").length, 0);
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(ActividadTarea, { tarea: tarea() }) }));
    assert.match(texto(), /Todavía no hay actividad\. Aparece cuando envíe su evidencia\./);
    assert.equal(texto().includes("Aprobad"), false);
  } finally {
    await desmontar();
  }
});

test("en revisión, ningún paso lleva el check lima: el actual y los futuros quedan con círculo vacío", async () => {
  try {
    await montar(createElement(ActividadTarea, { tarea: tarea({ estado: "en revisión", enviadaEn: "2026-10-10T15:00:00Z" }) }));
    const pasos = marcas();
    assert.equal(pasos.length, 3);
    assert.deepEqual(pasos.map((paso) => paso.hecho), ["no", "no", "no"]);
    assert.deepEqual(pasos.map((paso) => paso.check), ["", "", ""]);
    assert.equal(document.querySelector(".hyto-rastreo li[aria-current='step'] .hyto-rastreo-texto")?.textContent, "In review");
  } finally {
    await desmontar();
  }
});

test("pagada, los tres pasos pasaron de verdad y llevan el check", async () => {
  try {
    await montar(createElement(ActividadTarea, { tarea: tarea({ estado: "pagado", hashPago: "HASH", enviadaEn: "2026-10-10T15:00:00Z" }) }));
    const pasos = marcas();
    assert.deepEqual(pasos.map((paso) => paso.hecho), ["si", "si", "si"]);
    assert.deepEqual(pasos.map((paso) => paso.check), ["✓", "✓", "✓"]);
  } finally {
    await desmontar();
  }
});
