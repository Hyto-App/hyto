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

    const orden = document.querySelector("[aria-label='Sort tasks']");
    assert.ok(orden);
    assert.equal(orden?.querySelectorAll("button").length, 2);
    assert.equal(orden?.querySelector("[aria-pressed='true']")?.textContent, "Default");
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

    await pulsar("Highest pay");
    assert.equal(document.querySelector("[aria-label='Sort tasks'] [aria-pressed='true']")?.textContent, "Highest pay");
    assert.deepEqual(titulos(), ["Meal", "Check-in", "Blank"]);

    await pulsar("All");
    assert.deepEqual(titulos(), ["Booth", "Meal", "Check-in", "Blank"]);
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
