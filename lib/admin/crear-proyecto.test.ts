import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { CrearProyecto } from "../../components/admin/CrearProyecto";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { leerMemoriaAdmin } from "./memoria";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

async function elegir(selector: string, valor: string): Promise<void> {
  const nodo = document.querySelector(selector);
  if (!(nodo instanceof HTMLSelectElement)) throw new Error(`No está ${selector}.`);
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(nodo, valor);
    nodo.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

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

test("crear evento manda la prioridad y la dificultad que elige el organizador", async () => {
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
    const prioridad = document.querySelector("#prioridad-1");
    const dificultad = document.querySelector("#dificultad-1");
    assert.ok(prioridad instanceof HTMLSelectElement && prioridad.value === "normal");
    assert.ok(dificultad instanceof HTMLSelectElement && dificultad.value === "");
    assert.match(prioridad.closest("div")?.className ?? "", /grid-cols-1/);
    assert.match(prioridad.closest("div")?.className ?? "", /sm:grid-cols-2/);
    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "8");
    await elegir("#prioridad-1", "high");
    await elegir("#dificultad-1", "hard");
    await pulsar("Create event");
    assert.equal(cuerpos.length, 1);
    assert.equal(cuerpos[0]?.tareas?.[0]?.titulo, "Cajas");
    assert.equal(cuerpos[0]?.tareas?.[0]?.prioridad, "high");
    assert.equal(cuerpos[0]?.tareas?.[0]?.dificultad, "hard");
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
    const nombre = document.querySelector("#nombre-proyecto");
    assert.ok(nombre instanceof HTMLInputElement);
    assert.equal(nombre.getAttribute("aria-invalid"), "true");
    const descrito = nombre.getAttribute("aria-describedby");
    assert.equal(descrito, "nombre-proyecto-error");
    const error = document.getElementById(descrito ?? "");
    assert.match(error?.textContent ?? "", /Enter an event name/);
    assert.equal(document.activeElement, nombre);
    assert.doesNotMatch(document.querySelector("aside")?.textContent ?? "", /Enter an event name/);
    assert.equal(llamados, 0);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
