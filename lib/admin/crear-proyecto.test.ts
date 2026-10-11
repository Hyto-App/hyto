import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { CrearProyecto } from "../../components/admin/CrearProyecto";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { ejemploCasaAlquiler, calcularPresupuesto, puedeCrear } from "./crear-flujo";
import { leerMemoriaAdmin } from "./memoria";
import { desmontar, escribir, escribirArea, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

function botonCrear(): HTMLButtonElement {
  const boton = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Create project and set the budget aside"));
  assert.ok(boton instanceof HTMLButtonElement, "Falta el botón de crear.");
  return boton;
}

/** Name, one task, then step 3. */
async function llenarHastaVista(monto = "8"): Promise<void> {
  await escribirArea("#nombre-proyecto", "Feria");
  await pulsar("Next");
  await escribir("#titulo-1", "Cajas");
  await escribir("#monto-1", monto);
  await pulsar("See how it looks");
}

function conFetch(respuesta: () => Response): { cuerpos: Record<string, unknown>[]; restaurar: () => void } {
  const anterior = globalThis.fetch;
  const cuerpos: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_entrada: RequestInfo | URL, init?: RequestInit) => {
    cuerpos.push(typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {});
    return respuesta();
  }) as typeof fetch;
  return { cuerpos, restaurar: () => (globalThis.fetch = anterior) };
}

function creado(): Response {
  return new Response(JSON.stringify({ proyecto: { id: "evt" } }), { status: 201, headers: { "content-type": "application/json" } });
}

test("en modo demo se recorren los tres pasos, se ve el aviso y crear queda apagado", async () => {
  limpiarPantalla();
  const idas: string[] = [];
  const red = conFetch(creado);
  try {
    await montar(createElement(ProveedorModoDemo, { activo: true, rol: "organizador", children: createElement(CrearProyecto) }), {
      push: (href) => idas.push(href),
    });
    assert.match(texto(), /In the demo you can see everything\. To create a real project, sign in with your email\./);
    await llenarHastaVista();
    assert.match(texto(), /This is how your team will see it/);
    assert.equal(botonCrear().disabled, true);
    await pulsar("Create project and set the budget aside");
    assert.equal(red.cuerpos.length, 0);
    assert.equal(leerMemoriaAdmin().proyecto, null);
    assert.deepEqual(idas, []);
  } finally {
    red.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("crear proyecto manda prioridad normal, dificultad nula y abre el proyecto", async () => {
  limpiarPantalla();
  const idas: string[] = [];
  const red = conFetch(creado);
  try {
    await montar(createElement(CrearProyecto), { push: (href) => idas.push(href) });
    assert.equal(/Priority|Difficulty/.test(texto()), false);
    await llenarHastaVista();
    await pulsar("Create project and set the budget aside");
    assert.equal(red.cuerpos.length, 1);
    const tareas = red.cuerpos[0]?.tareas as { titulo?: string; prioridad?: string; dificultad?: string | null; monto?: string }[];
    assert.equal(red.cuerpos[0]?.nombre, "Feria");
    assert.equal(tareas[0]?.titulo, "Cajas");
    assert.equal(tareas[0]?.prioridad, "normal");
    assert.equal(tareas[0]?.dificultad, null);
    assert.deepEqual(idas, ["/eventos/evt"]);
  } finally {
    red.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("la fecha «¿Para cuándo?» solo se manda cuando la base la tiene", async () => {
  limpiarPantalla();
  const red = conFetch(creado);
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    assert.equal(document.querySelector("#fecha-proyecto"), null);
    await montar(createElement(CrearProyecto, { conFecha: true }), { push: () => undefined });
    await escribir("#fecha-proyecto", "2026-10-17");
    await llenarHastaVista();
    await pulsar("Create project and set the budget aside");
    assert.equal(red.cuerpos[0]?.fecha, "2026-10-17");
  } finally {
    red.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("un monto negativo no deja pasar al paso 3 y no llama a la API", async () => {
  limpiarPantalla();
  const red = conFetch(() => new Response("{}", { status: 500 }));
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    await llenarHastaVista("-5");
    assert.match(texto(), /amount greater than zero/i);
    assert.doesNotMatch(texto(), /This is how your team will see it/);
    assert.equal(red.cuerpos.length, 0);
  } finally {
    red.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("sin nombre no pasa del paso 1", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    await pulsar("Next");
    assert.match(texto(), /Name your project to continue\./);
    assert.equal(document.querySelector("#titulo-1"), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("saldo insuficiente: barra naranja, Agregar saldo y el botón de crear apagado sin llamar a la API", async () => {
  limpiarPantalla();
  const red = conFetch(creado);
  try {
    await montar(createElement(CrearProyecto, { saldo: "20" }), { push: () => undefined });
    await llenarHastaVista("30");
    const barra = document.querySelector(".cp-presupuesto");
    assert.equal(barra?.classList.contains("is-falta"), true);
    // US$30 plus the US$1 reserve against US$20.
    assert.match(barra?.textContent ?? "", /Your balance: US\$20\.00/);
    assert.match(barra?.textContent ?? "", /You are short US\$11\.00/);
    assert.equal((barra?.textContent ?? "").includes("USDC"), false);
    assert.match(document.querySelector("#aviso-saldo-crear")?.textContent ?? "", /does not cover this budget.*US\$1\.00 reserve/);
    const agregar = [...document.querySelectorAll("a")].find((enlace) => enlace.textContent?.includes("Add balance"));
    assert.equal(agregar?.getAttribute("href"), "/configuracion#saldo");
    const boton = botonCrear();
    assert.equal(boton.disabled, true);
    assert.equal(boton.getAttribute("aria-describedby"), "aviso-saldo-crear");
    await pulsar("Create project and set the budget aside");
    assert.equal(red.cuerpos.length, 0);

    // The breakdown opens from the bar.
    await pulsar("See breakdown");
    assert.match(document.querySelector("#cp-desglose")?.textContent ?? "", /Work tasks/);
  } finally {
    red.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("con saldo suficiente la barra dice cuánto queda y crear envía", async () => {
  limpiarPantalla();
  const red = conFetch(creado);
  try {
    await montar(createElement(CrearProyecto, { saldo: "40" }), { push: () => undefined });
    await llenarHastaVista("30");
    assert.match(document.querySelector(".cp-presupuesto")?.textContent ?? "", /You have US\$10\.00 left/);
    assert.equal(document.querySelector("#aviso-saldo-crear"), null);
    assert.equal(botonCrear().disabled, false);
    await pulsar("Create project and set the budget aside");
    assert.equal(red.cuerpos.length, 1);
  } finally {
    red.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("puedeCrear: apagado sin saldo, en demo, enviando o con total cero", () => {
  const filas = [{ clave: "1", titulo: "A", tipo: "trabajo" as const, monto: "30", condicion: "", asignado: "" }];
  assert.equal(puedeCrear(calcularPresupuesto(filas, "20"), { demo: false, enviando: false, creado: false }), false);
  assert.equal(puedeCrear(calcularPresupuesto(filas, "31"), { demo: false, enviando: false, creado: false }), true);
  assert.equal(puedeCrear(calcularPresupuesto(filas, "31"), { demo: true, enviando: false, creado: false }), false);
  assert.equal(puedeCrear(calcularPresupuesto(filas, "31"), { demo: false, enviando: true, creado: false }), false);
  assert.equal(puedeCrear(calcularPresupuesto([{ ...filas[0]!, monto: "" }], "31"), { demo: false, enviando: false, creado: false }), false);
});

test("Usar un ejemplo: Casa de alquiler llena cinco tareas, la última es reembolso y nunca dice Airbnb", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(CrearProyecto, { saldo: "500" }) }), { push: () => undefined });
    await pulsar("Usar un ejemplo: Casa de alquiler");
    const titulos = [...document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>("[id^='titulo-']")].map((campo) => campo.value);
    assert.equal(titulos.length, 5);
    assert.equal(titulos[0], "Limpiar y ordenar la habitación 2");
    const montos = [...document.querySelectorAll<HTMLInputElement>("[id^='monto-']")].map((campo) => campo.value);
    assert.deepEqual(montos, ["25", "20", "15", "20", "40"]);
    const tipos = [...document.querySelectorAll(".cp-tipos")].map((grupo) => grupo.querySelector("[aria-pressed='true']")?.textContent ?? "");
    assert.match(tipos[4] ?? "", /Reembolso/);
    assert.equal(tipos.slice(0, 4).every((tipo) => /Trabajo/.test(tipo)), true);
    assert.match(document.querySelector(".cp-presupuesto")?.textContent ?? "", /US\$120,00/);
    assert.match(document.querySelector(".cp-presupuesto")?.textContent ?? "", /5 tareas/);
    assert.doesNotMatch(texto(), /airbnb/i);
    await pulsar("Ver cómo queda");
    assert.match(document.querySelector(".cp-vista-titulo")?.textContent ?? "", /Casa de alquiler/);
    assert.doesNotMatch(texto(), /airbnb/i);

    const ejemplo = ejemploCasaAlquiler("en");
    assert.equal(ejemplo.filas.length, 5);
    assert.equal(ejemplo.filas[4]?.tipo, "reembolso");
    assert.doesNotMatch(JSON.stringify([ejemploCasaAlquiler("en"), ejemploCasaAlquiler("es")]), /airbnb/i);
    // Evidence is never only «photo»: each task says what the evidence should show.
    assert.equal(ejemplo.filas.every((fila) => fila.condicion.trim().length > 0), true);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("Agregar otra tarea suma una tarjeta con clic y con toque", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    await escribirArea("#nombre-proyecto", "Feria");
    await pulsar("Next");
    const boton = document.querySelector("[data-agregar-tarea]");
    assert.ok(boton instanceof HTMLButtonElement);
    const contar = () => document.querySelectorAll(".cp-tarjetas > *").length;
    assert.equal(contar(), 1);
    await pulsar("Add another task");
    assert.equal(contar(), 2);
    // Touch: pointerdown (default prevented so the keyboard stays) then click.
    await act(async () => {
      const toque = new Event("pointerdown", { bubbles: true, cancelable: true }) as Event & { pointerType?: string };
      Object.defineProperty(toque, "pointerType", { value: "touch" });
      boton.dispatchEvent(toque);
      boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(contar(), 3);
    assert.match(texto(), /Task 3/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
