import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { CrearProyecto } from "../../components/admin/CrearProyecto";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { leerMemoriaAdmin } from "./memoria";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

test("en modo demo CrearProyecto no guarda y muestra el aviso", async () => {
  limpiarPantalla();
  const idas: string[] = [];
  try {
    await montar(
      createElement(ProveedorModoDemo, { activo: true, rol: "organizador", children: createElement(CrearProyecto) }),
      { push: (href) => idas.push(href) },
    );
    assert.match(texto(), /Demo mode cannot create events/);
    const fondear = [...document.querySelectorAll("button")].find((boton) => boton.textContent?.includes("Create event"));
    assert.equal(fondear instanceof HTMLButtonElement && fondear.disabled, true);
    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "8");
    await pulsar("Create event");
    assert.equal(leerMemoriaAdmin().proyecto, null);
    assert.deepEqual(idas, []);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("crear evento no ofrece prioridad ni dificultad y no las manda", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const cuerpos: { nombre?: string; tareas?: { prioridad?: string; dificultad?: string | null; titulo?: string }[] }[] = [];
  globalThis.fetch = (async (_entrada: RequestInfo | URL, init?: RequestInit) => {
    cuerpos.push(JSON.parse(String(init?.body)) as (typeof cuerpos)[number]);
    return new Response(JSON.stringify({ proyecto: { id: "evt" } }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  const idas: string[] = [];
  try {
    await montar(createElement(CrearProyecto), { push: (href) => idas.push(href) });
    assert.equal(document.querySelector("#prioridad-1"), null);
    assert.equal(document.querySelector("#dificultad-1"), null);
    assert.match(document.querySelector("label[for=condicion-1]")?.textContent ?? "", /^Evidence must show$/);
    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "8");
    await pulsar("Create event");
    assert.equal(cuerpos.length, 1);
    assert.equal(cuerpos[0]?.tareas?.[0]?.titulo, "Cajas");
    assert.equal(cuerpos[0]?.tareas?.[0]?.prioridad, undefined);
    assert.equal(cuerpos[0]?.tareas?.[0]?.dificultad, undefined);
    assert.deepEqual(idas, ["/eventos/evt"]);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("create event rejects a negative amount with a clear amount error", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let llamados = 0;
  globalThis.fetch = (async () => {
    llamados += 1;
    return new Response("{}", { status: 500 });
  }) as typeof fetch;
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    await escribir("#nombre-proyecto", "QA test (do not save)");
    await escribir("#titulo-1", "Test");
    await escribir("#monto-1", "-5");
    await pulsar("Create event");
    assert.match(texto(), /amount greater than zero/i);
    assert.equal(llamados, 0);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("crear evento sin saldo suficiente deja el botón apagado y no llama a la API", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let llamados = 0;
  globalThis.fetch = (async () => {
    llamados += 1;
    return new Response(JSON.stringify({ aviso: "no" }), { status: 400 });
  }) as typeof fetch;
  try {
    await montar(createElement(CrearProyecto, { saldo: "0" }), { push: () => undefined });
    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Comida");
    await escribir("#monto-1", "30");
    const boton = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Create event"));
    assert.ok(boton instanceof HTMLButtonElement);
    assert.equal(boton.disabled, true);
    const aviso = document.querySelector("#aviso-saldo-crear");
    assert.match(aviso?.textContent ?? "", /Your balance does not cover US\$31\.00/);
    assert.match(aviso?.textContent ?? "", /US\$1\.00 reserve/);
    assert.match(aviso?.textContent ?? "", /You are short US\$31\.00/);
    assert.equal(/US\$31(?!\.00)/.test(aviso?.textContent ?? ""), false);
    assert.equal((aviso?.textContent ?? "").includes("USDC"), false);
    await pulsar("Create event");
    assert.equal(llamados, 0);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("crear evento con saldo suficiente sigue enviando el pedido", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let llamados = 0;
  globalThis.fetch = (async () => {
    llamados += 1;
    return new Response(JSON.stringify({ proyecto: { id: "evt" } }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await montar(createElement(CrearProyecto, { saldo: "40" }), { push: () => undefined });
    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Comida");
    await escribir("#monto-1", "30");
    const boton = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Create event"));
    assert.ok(boton instanceof HTMLButtonElement && boton.disabled === false);
    await pulsar("Create event");
    assert.equal(llamados, 1);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("create event asks for a name when the name is empty", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let llamados = 0;
  globalThis.fetch = (async () => {
    llamados += 1;
    return new Response("{}", { status: 500 });
  }) as typeof fetch;
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    await escribir("#titulo-1", "Test");
    await escribir("#monto-1", "5");
    await pulsar("Create event");
    assert.match(texto(), /Enter an event name/);
    assert.equal(llamados, 0);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
