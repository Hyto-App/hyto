import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { MisTareas } from "@/components/integrante/MisTareas";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";
import type { Tarea } from "./tipos";

const TAREAS: Tarea[] = [
  {
    id: "alta",
    proyectoId: "uno",
    titulo: "Booth",
    tipo: "trabajo",
    monto: "30",
    tope: null,
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado: "pagado",
    prioridad: "normal",
    dificultad: "hard",
  },
  {
    id: "media",
    proyectoId: "dos",
    titulo: "Check-in",
    tipo: "trabajo",
    monto: "20",
    tope: "99",
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado: "pendiente",
    prioridad: "high",
    dificultad: "medium",
  },
  {
    id: "comida",
    proyectoId: "uno",
    titulo: "Meal",
    tipo: "reembolso",
    monto: "8",
    tope: "30",
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado: "pendiente",
    prioridad: "high",
    dificultad: "easy",
  },
  {
    id: "vacio",
    proyectoId: "dos",
    titulo: "Blank",
    tipo: "trabajo",
    monto: "",
    tope: null,
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado: "pendiente",
    prioridad: "normal",
    dificultad: null,
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function titulos(): string[] {
  return [...document.querySelectorAll("h3")].map((nodo) => nodo.textContent ?? "");
}

function insignias(): string[] {
  return [...document.querySelectorAll("article")]
    .filter((nodo) => nodo.textContent?.includes("Best paid"))
    .map((nodo) => nodo.querySelector("h3")?.textContent ?? "");
}

test("Mis tareas marca el mejor pago y ordena sin perder el filtro", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/tareas")) return json({ tareas: TAREAS });
    if (url.startsWith("/api/proyectos")) {
      return json({
        proyectos: [
          { id: "uno", nombre: "North" },
          { id: "dos", nombre: "South" },
        ],
      });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;

  try {
    await montar(createElement(MisTareas));
    await esperar(() => texto().includes("Booth") && texto().includes("Blank"));

    await pulsar("Sort");
    const orden = document.querySelector("[aria-label='Sort tasks']");
    assert.ok(orden);
    assert.equal(orden?.querySelectorAll("button").length, 3);
    assert.deepEqual(
      [...(orden?.querySelectorAll("button") ?? [])].map((boton) => boton.textContent),
      ["Priority", "Highest pay", "Default"],
    );
    assert.equal(orden?.querySelector("[aria-checked='true']")?.textContent, "Default");
    await pulsar("Default");
    assert.equal(document.querySelector("[aria-label='Sort tasks']"), null);
    assert.deepEqual(titulos(), ["Booth", "Meal", "Check-in", "Blank"]);
    assert.deepEqual(insignias().sort(), ["Booth", "Meal"]);
    for (const insignia of document.querySelectorAll("article .hyto-pill-ok")) {
      if (!insignia.textContent?.includes("Best paid")) continue;
      assert.match(insignia.className, /hyto-pill /);
      assert.equal(insignia.className.includes("hyto-pill-bad"), false);
    }

    await pulsar("Pending");
    assert.deepEqual(titulos(), ["Check-in", "Blank", "Meal"]);
    assert.deepEqual(insignias(), ["Meal"]);

    await pulsar("Sort");
    await pulsar("Highest pay");
    await pulsar("Sort");
    assert.equal(document.querySelector("[aria-label='Sort tasks'] [aria-checked='true']")?.textContent, "Highest pay");
    await pulsar("Highest pay");
    assert.deepEqual(titulos(), ["Meal", "Check-in", "Blank"]);

    await pulsar("All");
    assert.deepEqual(titulos(), ["Booth", "Meal", "Check-in", "Blank"]);

    const booth = [...document.querySelectorAll("article")].find((nodo) => nodo.querySelector("h3")?.textContent === "Booth");
    const checkin = [...document.querySelectorAll("article")].find((nodo) => nodo.querySelector("h3")?.textContent === "Check-in");
    const blank = [...document.querySelectorAll("article")].find((nodo) => nodo.querySelector("h3")?.textContent === "Blank");
    const boothAltas = [...(booth?.querySelectorAll(".hyto-pill-ok") ?? [])].map((nodo) => nodo.textContent ?? "");
    assert.equal(boothAltas.some((textoPildora) => textoPildora.includes("High priority")), false);
    assert.match(booth?.querySelector(".hyto-pill-muted")?.textContent ?? "", /Hard/);
    assert.equal(booth?.querySelector(".hyto-pill-muted")?.className.includes("hyto-pill-bad"), false);
    assert.match(checkin?.querySelector(".hyto-pill-ok")?.textContent ?? "", /High priority/);
    assert.match(checkin?.textContent ?? "", /Medium/);
    assert.equal(checkin?.querySelector(".hyto-pill-ok")?.className.includes("hyto-pill "), true);
    assert.equal(blank?.textContent?.includes("High priority"), false);
    assert.equal(/\b(Easy|Medium|Hard)\b/.test(blank?.textContent ?? ""), false);

    await pulsar("Sort");
    await pulsar("Priority");
    await pulsar("Sort");
    assert.equal(document.querySelector("[aria-label='Sort tasks'] [aria-checked='true']")?.textContent, "Priority");
    await pulsar("Priority");
    assert.deepEqual(titulos(), ["Check-in", "Meal", "Booth", "Blank"]);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 25; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}
