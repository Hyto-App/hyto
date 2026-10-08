import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { CrearProyecto } from "../../components/admin/CrearProyecto";
import { ListaOrganizaciones } from "../../components/organizaciones/Pantallas";
import { SelectorContactos } from "../../components/organizaciones/SelectorContactos";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

const original = globalThis.fetch;

async function esperar(): Promise<void> {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 30));
  });
}

async function elegir(selector: string, valor: string): Promise<void> {
  const nodo = document.querySelector(selector);
  if (!(nodo instanceof HTMLSelectElement)) throw new Error(`No está ${selector}.`);
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(nodo, valor);
    nodo.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

test("sin organizaciones Crear evento no muestra el selector ni pide nada", async () => {
  limpiarPantalla();
  const pedidos: string[] = [];
  globalThis.fetch = (async (entrada: RequestInfo | URL) => {
    pedidos.push(String(entrada));
    return Response.json({});
  }) as typeof fetch;
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    await esperar();
    assert.equal(document.querySelector("#organizacion-proyecto"), null);
    assert.equal(document.querySelector("#sugeridos-asignado"), null);
    assert.deepEqual(pedidos, []);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("con organizaciones Crear evento ofrece el selector, sugiere contactos y manda el id", async () => {
  limpiarPantalla();
  const cuerpos: { organizacionId?: string }[] = [];
  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada);
    if (url === "/api/organizaciones/o1/contactos") {
      return Response.json({ contactos: [{ email: "ana@hyto.app", nombre: "Ana" }, { email: "luis@hyto.app", nombre: null }] });
    }
    if (url === "/api/proyectos") {
      cuerpos.push(JSON.parse(String(init?.body)) as { organizacionId?: string });
      return Response.json({ proyecto: { id: "evt" } }, { status: 201 });
    }
    return Response.json({}, { status: 404 });
  }) as typeof fetch;
  const idas: string[] = [];
  try {
    await montar(createElement(CrearProyecto, { organizaciones: [{ id: "o1", nombre: "Norte" }] }), { push: (href) => idas.push(href) });
    const selector = document.querySelector("#organizacion-proyecto");
    assert.ok(selector instanceof HTMLSelectElement);
    assert.equal(selector.value, "");
    assert.deepEqual(
      [...selector.options].map((opcion) => opcion.textContent),
      ["No organization", "Norte"],
    );
    // Without an organization the assignee stays a plain email field.
    assert.equal(document.querySelector("#asignado-1")?.getAttribute("list"), null);

    await elegir("#organizacion-proyecto", "o1");
    await esperar();
    assert.equal(document.querySelector("#asignado-1")?.getAttribute("list"), "sugeridos-asignado");
    assert.deepEqual(
      [...document.querySelectorAll("#sugeridos-asignado option")].map((opcion) => opcion.getAttribute("value")),
      ["ana@hyto.app", "luis@hyto.app"],
    );

    await escribir("#nombre-proyecto", "Feria");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "8");
    await escribir("#asignado-1", "otra@persona.com");
    await pulsar("Create event");
    assert.equal(cuerpos.length, 1);
    assert.equal(cuerpos[0]?.organizacionId, "o1");
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("el selector del evento muestra sugeridos y guardados, busca y cuenta lo elegido", async () => {
  limpiarPantalla();
  const contacto = (email: string, nombre: string | null, enElEvento = false) => ({
    email,
    nombre,
    etiquetas: [],
    participaciones: 0,
    enElEvento,
  });
  globalThis.fetch = (async (entrada: RequestInfo | URL) => {
    if (String(entrada) === "/api/eventos/e1/contactos") {
      return Response.json({
        organizacion: { id: "o1", nombre: "Norte" },
        sugeridos: [contacto("ana@hyto.app", "Ana")],
        guardados: [contacto("ana@hyto.app", "Ana"), contacto("luis@hyto.app", "Luis"), contacto("bea@hyto.app", "Bea", true)],
      });
    }
    return Response.json({}, { status: 404 });
  }) as typeof fetch;
  try {
    await montar(createElement(SelectorContactos, { proyectoId: "e1" }));
    await esperar();
    assert.match(texto(), /Suggested/);
    assert.match(texto(), /Saved/);
    assert.match(texto(), /Invite someone new by email/);
    assert.match(texto(), /Already in this event/);
    const invitar = () => [...document.querySelectorAll("button")].find((boton) => /^Invite \d+$/.test(boton.textContent ?? ""));
    assert.equal(invitar()?.textContent, "Invite 0");
    assert.equal(invitar()?.disabled, true);

    const marcar = document.getElementById("guardado-luis@hyto.app");
    assert.ok(marcar instanceof HTMLInputElement);
    await act(async () => {
      marcar.click();
    });
    assert.equal(invitar()?.textContent, "Invite 1");
    assert.equal(invitar()?.disabled, false);
    const enEvento = document.getElementById("guardado-bea@hyto.app");
    assert.ok(enEvento instanceof HTMLInputElement && enEvento.disabled);

    await escribir("#buscar-guardados", "zzz");
    assert.match(texto(), /No one matches that search/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("el selector sin permiso muestra la invitación por correo de siempre", async () => {
  limpiarPantalla();
  globalThis.fetch = (async () => Response.json({ aviso: "Only an admin of this organization can do that." }, { status: 403 })) as typeof fetch;
  try {
    await montar(createElement(SelectorContactos, { proyectoId: "e1", respaldo: createElement("p", null, "correo plano") }));
    await esperar();
    assert.match(texto(), /correo plano/);
    assert.doesNotMatch(texto(), /Suggested/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("la lista muestra las organizaciones que administro y la acción de crear", async () => {
  limpiarPantalla();
  globalThis.fetch = (async () =>
    Response.json({ organizaciones: [{ id: "o1", nombre: "Norte", descripcion: "Becas", etiquetas: ["becas", "tech"] }] })) as typeof fetch;
  try {
    await montar(createElement(ListaOrganizaciones), { push: () => undefined });
    await esperar();
    assert.match(texto(), /Organizations/);
    assert.match(texto(), /Norte/);
    assert.match(texto(), /becas · tech/);
    assert.match(texto(), /Create organization/);
    assert.ok(document.querySelector('a[href="/organizaciones/nueva"]'));
    assert.ok(document.querySelector('a[href="/organizaciones/o1"]'));
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
