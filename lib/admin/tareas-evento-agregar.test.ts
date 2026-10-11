import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { TareasEvento } from "../../components/admin/TareasEvento";
import { desmontar, escribir, escribirArea, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

const BOOTH = {
  id: "stand",
  titulo: "Booth",
  tipo: "trabajo" as const,
  monto: "20",
  tope: null,
  estado: "pendiente",
  miembroId: "",
  condicion: "",
  prioridad: "normal" as const,
  dificultad: null,
  bloqueo: null,
  tieneFoto: false,
};

test("«+ Add task» cierra la lista, abre la tarjeta del asistente y suma la tarea al total", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const pedidos: { url: string; cuerpo: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    pedidos.push({ url: String(entrada), cuerpo: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown> });
    return new Response(
      JSON.stringify({
        tarea: {
          id: "nueva",
          proyectoId: "evt",
          titulo: "Clean up",
          tipo: "trabajo",
          monto: "12.50",
          tope: null,
          condicion: "Empty hall",
          miembroId: "",
          estado: "pendiente",
          prioridad: "normal",
          dificultad: null,
        },
      }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    await montar(createElement(TareasEvento, { eventoId: "evt", saldo: "100", miembros: [], tareas: [BOOTH] }));
    assert.match(texto(), /US\$20\.00 in total/);
    // Mock B: the list's last row, neutral dashed (.cp-agregar), not the lime button.
    const fila = document.querySelector(".pj-tlista > li:last-child");
    assert.equal(fila?.hasAttribute("data-agregar-tarea"), true);
    const boton = fila?.querySelector("button");
    assert.equal(boton?.classList.contains("cp-agregar"), true);
    assert.equal(boton?.classList.contains("hyto-btn"), false);
    assert.equal(boton?.textContent, "Add task");

    await pulsar("Add task");
    const tarjeta = document.querySelector(".pj-tlista .cp-suelta .cp-tarjeta");
    assert.ok(tarjeta, "the wizard's task card");
    assert.match(tarjeta.textContent ?? "", /Task 2/);
    const clave = tarjeta.id.replace(/^tarea-/, "");

    // Same checks as the wizard: a card with nothing in it is not sent.
    await pulsar("Add task");
    assert.equal(pedidos.length, 0);
    assert.ok(document.querySelector(".cp-suelta [role=alert]"));

    await escribir(`#titulo-${clave}`, "Clean up");
    await escribir(`#monto-${clave}`, "12.5");
    await escribirArea(`#condicion-${clave}`, "Empty hall");
    await pulsar("Add task");
    for (let i = 0; i < 20 && !document.querySelector('[data-tarea="nueva"]'); i += 1) {
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 5));
      });
    }
    assert.equal(pedidos.length, 1);
    assert.equal(pedidos[0]?.url, "/api/eventos/evt/tareas");
    assert.equal(pedidos[0]?.cuerpo.titulo, "Clean up");
    assert.equal(pedidos[0]?.cuerpo.tipo, "trabajo");
    assert.equal(pedidos[0]?.cuerpo.monto, "12.50");
    assert.equal(pedidos[0]?.cuerpo.condicion, "Empty hall");
    assert.ok(document.querySelector('[data-tarea="nueva"]'));
    assert.match(texto(), /2 tasks/);
    assert.match(texto(), /US\$32\.50 in total/);
    // The form closes and the row is back at the end of the list.
    assert.equal(document.querySelector(".cp-suelta"), null);
    assert.equal(document.querySelector(".pj-tlista > li:last-child")?.hasAttribute("data-agregar-tarea"), true);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("un saldo que no cubre la tarea nueva avisa y no la envía", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let llamados = 0;
  globalThis.fetch = (async () => {
    llamados += 1;
    return new Response("{}", { status: 500 });
  }) as typeof fetch;
  try {
    await montar(createElement(TareasEvento, { eventoId: "evt", saldo: "5", miembros: [], tareas: [BOOTH] }));
    await pulsar("Add task");
    const clave = document.querySelector(".cp-suelta .cp-tarjeta")!.id.replace(/^tarea-/, "");
    await escribir(`#titulo-${clave}`, "Clean up");
    await escribir(`#monto-${clave}`, "12");
    await pulsar("Add task");
    assert.equal(llamados, 0);
    assert.ok(document.querySelector(".cp-suelta [role=alert]"));
    assert.match(texto(), /US\$20\.00 in total/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("una lista vacía también ofrece «+ Add task»; sin eventoId no aparece", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(TareasEvento, { eventoId: "evt", miembros: [], tareas: [] }));
    assert.ok(document.querySelector("[data-agregar-tarea] .cp-agregar"));
    await desmontar();
    limpiarPantalla();
    await montar(createElement(TareasEvento, { miembros: [], tareas: [BOOTH] }));
    assert.equal(document.querySelector("[data-agregar-tarea]"), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
