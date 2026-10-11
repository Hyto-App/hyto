import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { CrearProyecto } from "../../components/admin/CrearProyecto";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { ProveedorIdioma } from "../../components/ui/Idioma";
import { hoyLocal, moverDia } from "@/lib/tareas/fecha-limite";
import { ejemploCasaAlquiler, calcularPresupuesto, montoEnCampo, puedeCrear } from "./crear-flujo";
import { leerMemoriaAdmin } from "./memoria";
import { desmontar, escribir, escribirArea, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

function botonCrear(): HTMLButtonElement {
  const boton = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Create project"));
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
    await pulsar("Create project");
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
    await pulsar("Create project");
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
    const semana = moverDia(hoyLocal(), { dias: 7 });
    await escribir("#fecha-proyecto", semana);
    await llenarHastaVista();
    await pulsar("Create project");
    assert.equal(red.cuerpos[0]?.fecha, semana);
  } finally {
    red.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

async function salirDeFecha(): Promise<void> {
  const campo = document.querySelector("#fecha-proyecto");
  await act(async () => {
    campo?.dispatchEvent(new Event("focusout", { bubbles: true }));
  });
}

test("«¿Para cuándo?» va de hoy a cinco años y no deja seguir con una fecha pasada", async () => {
  limpiarPantalla();
  const red = conFetch(creado);
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(CrearProyecto, { conFecha: true }) }), { push: () => undefined });
    const campo = document.querySelector<HTMLInputElement>("#fecha-proyecto");
    const calendario = document.querySelector<HTMLInputElement>("[data-fecha-nativa]");
    const hoy = hoyLocal();
    assert.equal(calendario?.type, "date");
    assert.equal(calendario?.min, hoy);
    assert.equal(calendario?.max, moverDia(hoy, { anios: 5 }));
    await escribirArea("#nombre-proyecto", "Feria");
    await escribir("#fecha-proyecto", "2005-03-01");
    await salirDeFecha();
    assert.match(texto(), /Elija una fecha de hoy en adelante/);
    assert.equal(campo?.getAttribute("aria-invalid"), "true");
    await pulsar("Siguiente");
    // Still on step 1: the task cards are not there and nothing went to the API.
    assert.equal(document.querySelector("#titulo-1"), null);
    await escribir("#fecha-proyecto", moverDia(hoy, { dias: -1 }));
    await pulsar("Siguiente");
    assert.equal(document.querySelector("#titulo-1"), null);
    await escribir("#fecha-proyecto", moverDia(hoy, { anios: 6 }));
    await salirDeFecha();
    assert.match(texto(), /Elija una fecha dentro de los próximos 5 años/);
    await escribir("#fecha-proyecto", hoy);
    assert.doesNotMatch(texto(), /Elija una fecha/);
    await pulsar("Siguiente");
    assert.ok(document.querySelector("#titulo-1"));
    assert.equal(red.cuerpos.length, 0);
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
    assert.equal(barra?.closest(".cp-dock-col")?.classList.contains("is-falta"), true);
    // The compact bar: total and tasks, the small «Add balance», no breakdown.
    assert.match(barra?.textContent ?? "", /Total US\$30\.00 · 1 task/);
    assert.equal(barra?.querySelector("a")?.getAttribute("href"), "/configuracion#saldo");
    // The breakdown and balance live in the step's summary. US$30 plus the US$1 reserve against US$20.
    const resumen = document.querySelector(".cp-resumen");
    assert.equal(resumen?.classList.contains("is-falta"), true);
    assert.match(resumen?.textContent ?? "", /Your balance: US\$20\.00/);
    assert.match(resumen?.textContent ?? "", /You are short US\$11\.00/);
    assert.equal((resumen?.textContent ?? "").includes("USDC"), false);
    assert.match(document.querySelector("#aviso-saldo-crear")?.textContent ?? "", /does not cover this budget.*US\$1\.00 reserve/);
    const agregar = [...document.querySelectorAll("a")].find((enlace) => enlace.textContent?.includes("Add balance"));
    assert.equal(agregar?.getAttribute("href"), "/configuracion#saldo");
    const boton = botonCrear();
    assert.equal(boton.disabled, true);
    assert.equal(boton.getAttribute("aria-describedby"), "aviso-saldo-crear");
    await pulsar("Create project");
    assert.equal(red.cuerpos.length, 0);
    assert.match(resumen?.textContent ?? "", /Work tasks/);
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
    assert.match(document.querySelector(".cp-resumen")?.textContent ?? "", /You have US\$10\.00 left/);
    assert.equal(document.querySelector("#aviso-saldo-crear"), null);
    assert.equal(botonCrear().disabled, false);
    await pulsar("Create project");
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

test("Usar un ejemplo: Casa de alquiler no aparece en el flujo real", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(CrearProyecto, { saldo: "500" }) }), { push: () => undefined });
    assert.doesNotMatch(texto(), /Usar un ejemplo|Casa de alquiler|Llena cinco tareas/);
    assert.equal(document.querySelector(".cp-ejemplo"), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("en demo, Usar un ejemplo: Casa de alquiler llena cinco tareas, la última es reembolso y nunca dice Airbnb", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(ProveedorModoDemo, { activo: true, rol: "organizador", children: createElement(CrearProyecto, { saldo: "500" }) }),
      }),
      { push: () => undefined },
    );
    await pulsar("Usar un ejemplo: Casa de alquiler");
    const titulos = [...document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>("[id^='titulo-']")].map((campo) => campo.value);
    assert.equal(titulos.length, 5);
    assert.equal(titulos[0], "Limpiar y ordenar la habitación 2");
    const montos = [...document.querySelectorAll<HTMLInputElement>("[id^='monto-']")].map((campo) => campo.value);
    // Shown with two decimals, like every other amount on the screen.
    assert.deepEqual(montos, ["25,00", "20,00", "15,00", "20,00", "40,00"]);
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

test("el monto se ve con dos decimales y al editar muestra lo escrito", async () => {
  assert.equal(montoEnCampo("25", "es"), "25,00");
  assert.equal(montoEnCampo("25", "en"), "25.00");
  assert.equal(montoEnCampo("12.5", "en"), "12.50");
  assert.equal(montoEnCampo("", "es"), "");
  assert.equal(montoEnCampo("12.", "en"), "12.");
  assert.equal(montoEnCampo("-5", "en"), "-5");
  limpiarPantalla();
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    await escribirArea("#nombre-proyecto", "Feria");
    await pulsar("Next");
    const campo = document.querySelector("#monto-1") as HTMLInputElement;
    const Foco = (window as unknown as { FocusEvent: typeof FocusEvent }).FocusEvent;
    await act(async () => {
      campo.dispatchEvent(new Foco("focusin", { bubbles: true }));
    });
    await escribir("#monto-1", "8");
    assert.equal(campo.value, "8");
    await act(async () => {
      campo.dispatchEvent(new Foco("focusout", { bubbles: true }));
    });
    assert.equal(campo.value, "8.00");
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

/** Lets the requestAnimationFrame that moves to a field run. */
async function cuadro(): Promise<void> {
  await act(async () => {
    await new Promise((listo) => setTimeout(listo, 40));
  });
}

/** Records every element scrollIntoView was called on. */
function espiarScroll(): { vistos: Element[]; restaurar: () => void } {
  const proto = HTMLElement.prototype as unknown as { scrollIntoView: (opciones?: unknown) => void };
  const anterior = proto.scrollIntoView;
  const vistos: Element[] = [];
  proto.scrollIntoView = function (this: Element) {
    vistos.push(this);
  };
  return { vistos, restaurar: () => (proto.scrollIntoView = anterior) };
}

test("en el teléfono, Siguiente con una fecha pasada lleva la pantalla a la fecha y la marca en naranja", async () => {
  limpiarPantalla();
  const scroll = espiarScroll();
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(CrearProyecto, { conFecha: true }) }), { push: () => undefined });
    await escribirArea("#nombre-proyecto", "Feria");
    await escribir("#fecha-proyecto", moverDia(hoyLocal(), { dias: -3 }));
    await pulsar("Siguiente");
    const campo = document.querySelector("#fecha-proyecto");
    assert.equal(campo?.getAttribute("aria-invalid"), "true");
    assert.equal(scroll.vistos.at(-1), campo, "la pantalla no fue a la fecha");
    assert.equal(document.activeElement, campo);
    assert.match(texto(), /Elija una fecha de hoy en adelante/);
  } finally {
    scroll.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("sin nombre y con fecha pasada, se marcan los dos y la pantalla va primero al nombre", async () => {
  limpiarPantalla();
  const scroll = espiarScroll();
  try {
    await montar(createElement(CrearProyecto, { conFecha: true }), { push: () => undefined });
    await escribir("#fecha-proyecto", "2005-03-01");
    await pulsar("Next");
    assert.equal(document.querySelector(".cp-nombre")?.classList.contains("is-error"), true);
    assert.equal(document.querySelector("#fecha-proyecto")?.getAttribute("aria-invalid"), "true");
    assert.equal(scroll.vistos.at(-1), document.querySelector("#nombre-proyecto"));
  } finally {
    scroll.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("en el paso 2, el error lleva al campo de la tarea y lo marca en naranja", async () => {
  limpiarPantalla();
  const scroll = espiarScroll();
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    await escribirArea("#nombre-proyecto", "Feria");
    await pulsar("Next");
    await escribir("#titulo-1", "Cajas");
    await pulsar("See how it looks");
    await cuadro();
    const monto = document.querySelector("#monto-1");
    assert.equal(monto?.getAttribute("aria-invalid"), "true");
    assert.equal(monto?.closest(".cp-campo-grupo")?.classList.contains("is-invalido"), true);
    assert.equal(document.querySelector("#tarea-1")?.classList.contains("is-error"), true);
    assert.equal(scroll.vistos.at(-1), monto);
    // Typing clears the mark.
    await escribir("#monto-1", "8");
    assert.equal(document.querySelector(".cp-campo-grupo.is-invalido"), null);
  } finally {
    scroll.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("la barra del paso 3 es una sola línea: total y tareas a la izquierda, el botón a la derecha", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(CrearProyecto, { saldo: "500" }) }), { push: () => undefined });
    await escribirArea("#nombre-proyecto", "Feria");
    await pulsar("Siguiente");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "85");
    await pulsar("Ver cómo queda");
    const fila = document.querySelector(".cp-dock-col.is-compacta");
    assert.ok(fila, "falta la barra compacta");
    const hijos = [...(fila?.children ?? [])];
    assert.equal(hijos[0]?.classList.contains("cp-presupuesto"), true);
    assert.equal(hijos[1]?.tagName, "BUTTON");
    assert.match(hijos[0]?.textContent ?? "", /^Total US\$85,00 · 1 tarea$/);
    // No breakdown and no balance in the bar; both are in the summary of the step.
    assert.equal(fila?.querySelector(".cp-filas, [data-saldo], [aria-expanded]"), null);
    assert.match(document.querySelector(".cp-resumen.is-columna")?.textContent ?? "", /Tareas de trabajo.*Su saldo/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("en escritorio la columna derecha muestra la vista previa en vivo y luego el resumen", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(CrearProyecto, { saldo: "500" }), { push: () => undefined });
    const lado = () => document.querySelector(".cp-lado");
    assert.match(lado()?.textContent ?? "", /Preview.*Untitled project/);
    await escribirArea("#nombre-proyecto", "Feria del barrio");
    assert.match(lado()?.textContent ?? "", /Feria del barrio/);
    await pulsar("Next");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "8");
    assert.match(lado()?.textContent ?? "", /1 task · US\$8\.00/);
    assert.match(lado()?.querySelector(".cp-resumen")?.textContent ?? "", /Work tasks/);
    // The main button is inside the form column, not beside it.
    const boton = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("See how it looks"));
    assert.ok(boton?.closest(".cp-principal"));
    assert.equal(boton?.closest(".cp-lado"), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("en español la fecha se escribe día primero (dd/mm/aaaa) y el calendario la llena igual", async () => {
  limpiarPantalla();
  const red = conFetch(creado);
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(CrearProyecto, { conFecha: true, saldo: "500" }) }), { push: () => undefined });
    const campo = document.querySelector<HTMLInputElement>("#fecha-proyecto");
    assert.equal(campo?.placeholder, "dd/mm/aaaa");
    const semana = moverDia(hoyLocal(), { dias: 7 });
    const [anio, mes, dia] = semana.split("-");
    // Digits only: the slashes go in by themselves.
    await escribir("#fecha-proyecto", `${dia}${mes}${anio}`);
    assert.equal(campo?.value, `${dia}/${mes}/${anio}`);
    assert.equal(document.querySelector<HTMLInputElement>("[data-fecha-nativa]")?.value, semana);
    // The native picker writes back in the same order.
    const otro = moverDia(hoyLocal(), { dias: 9 });
    await escribir("[data-fecha-nativa]", otro);
    const [a2, m2, d2] = otro.split("-");
    assert.equal(campo?.value, `${d2}/${m2}/${a2}`);
    // Something that is not a day says how to write one.
    await escribir("#fecha-proyecto", "31/02/2027");
    await act(async () => {
      campo?.dispatchEvent(new Event("focusout", { bubbles: true }));
    });
    assert.match(texto(), /Escriba un día como 16\/10\/2026/);
    await escribir("#fecha-proyecto", `${d2}/${m2}/${a2}`);
    await escribirArea("#nombre-proyecto", "Feria");
    await pulsar("Siguiente");
    await escribir("#titulo-1", "Cajas");
    await escribir("#monto-1", "8");
    await pulsar("Ver cómo queda");
    await pulsar("Crear proyecto");
    assert.equal(red.cuerpos[0]?.fecha, otro);
  } finally {
    red.restaurar();
    await desmontar();
    limpiarPantalla();
  }
});

test("el nombre vacío muestra el ejemplo y una barra lima donde empieza el texto", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(ProveedorIdioma, { idioma: "es", children: createElement(CrearProyecto) }), { push: () => undefined });
    const campo = document.querySelector<HTMLTextAreaElement>("#nombre-proyecto");
    assert.equal(campo?.placeholder, "Ej.: Casa de alquiler · Playa Hermosa");
    // The bar sits with the field (same line), not as a separate dash under it.
    assert.equal(document.querySelector(".cp-cursor")?.parentElement, campo?.parentElement);
    assert.equal(document.querySelector(".cp-subrayado"), null);
    await escribirArea("#nombre-proyecto", "Feria");
    assert.equal(document.querySelector(".cp-cursor"), null);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
