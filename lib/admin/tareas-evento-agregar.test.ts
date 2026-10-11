import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { TareasEvento, type FilaTareaEvento } from "../../components/admin/TareasEvento";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

const STAND: FilaTareaEvento = {
  id: "stand",
  titulo: "Booth",
  tipo: "trabajo",
  monto: "20",
  tope: null,
  estado: "pendiente",
  miembroId: "",
  condicion: "",
  prioridad: "normal",
  dificultad: null,
  bloqueo: null,
  tieneFoto: false,
};

test("«+ Add task» es la última fila, neutra, abre la tarjeta del asistente y suma la tarea nueva", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const pedidos: { url: string; cuerpo: unknown }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    pedidos.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(
      JSON.stringify({
        tarea: {
          id: "limpieza",
          proyectoId: "evt",
          titulo: "Clean up",
          tipo: "trabajo",
          monto: "12.50",
          tope: null,
          condicion: "",
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
    await montar(createElement(TareasEvento, { eventoId: "evt", miembros: [], saldo: "100", tareas: [STAND] }));
    const filas = [...document.querySelectorAll(".pj-tlista > li")];
    const ultima = filas.at(-1);
    assert.ok(ultima?.classList.contains("pj-agregar-fila"));
    const boton = ultima?.querySelector("button.cp-agregar");
    assert.ok(boton);
    assert.match(boton?.textContent ?? "", /Add task/);
    // Not lime: the screen's lime action is «Lock N of N tasks».
    assert.equal(boton?.classList.contains("hyto-btn"), false);
    assert.match(texto(), /1 tasks|1 task/);
    assert.match(texto(), /US\$20\.00 in total/);

    await pulsar("Add task");
    assert.ok(document.querySelector(".pj-agregar-fila.cp-suelta .cp-tarjeta"));
    assert.match(texto(), /Task 2/);

    // An empty card is not sent.
    await pulsar("Save");
    assert.equal(pedidos.length, 0);
    assert.ok(document.querySelector(".pj-agregar-fila [role='alert']"));

    await escribir(".pj-agregar-fila input[id^='titulo-']", "Clean up");
    await escribir(".pj-agregar-fila input[id^='monto-']", "12.50");
    await pulsar("Save");
    await esperar(() => Boolean(document.querySelector('[data-tarea="limpieza"]')));
    assert.equal(pedidos.length, 1);
    assert.equal(pedidos[0]?.url, "/api/eventos/evt/tareas");
    const cuerpo = pedidos[0]?.cuerpo as { tarea: { titulo: string; tipo: string; monto: string } };
    assert.equal(cuerpo.tarea.titulo, "Clean up");
    assert.equal(cuerpo.tarea.tipo, "trabajo");
    assert.equal(cuerpo.tarea.monto, "12.50");

    // The new task joins the list; the row goes back to the button.
    assert.ok(document.querySelector('[data-tarea="limpieza"]'));
    assert.match(texto(), /2 tasks/);
    assert.match(texto(), /US\$32\.50 in total/);
    assert.equal(document.querySelector(".pj-agregar-fila .cp-tarjeta"), null);
    assert.ok(document.querySelector(".pj-tlista > li:last-child button.cp-agregar"));
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("si el saldo no cubre la tarea nueva más la reserva, no se envía", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = (async () => {
    llamadas += 1;
    return new Response("{}", { status: 500 });
  }) as typeof fetch;
  try {
    await montar(createElement(TareasEvento, { eventoId: "evt", miembros: [], saldo: "5", tareas: [STAND] }));
    await pulsar("Add task");
    await escribir(".pj-agregar-fila input[id^='titulo-']", "Clean up");
    await escribir(".pj-agregar-fila input[id^='monto-']", "12.50");
    await pulsar("Save");
    assert.equal(llamadas, 0);
    assert.match(texto(), /Your balance does not cover/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 25));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}

test("sin eventoId la lista no ofrece agregar", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(TareasEvento, { miembros: [], tareas: [STAND] }));
    assert.equal(document.querySelector(".cp-agregar"), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
