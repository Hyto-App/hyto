import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { CabeceraEvento } from "@/components/admin/CabeceraEvento";
import { TareasEvento, type FilaTareaEvento } from "@/components/admin/TareasEvento";
import { Unirse } from "@/components/admin/Unirse";
import { CrearProyecto } from "@/components/admin/CrearProyecto";
import { FormularioComunidad, UnirseCodigo } from "@/components/comunidades/Pantallas";
import { TipoCuenta } from "@/components/cuenta/TipoCuenta";
import { SubirEvidencia } from "@/components/integrante/SubirEvidencia";
import { AVISO_CON_FOTO } from "@/lib/api/editar-tarea";
import { tareasEjemplo } from "@/lib/integrante/ejemplos";
import { es, texto } from "@/lib/ui/diccionario";
import { desmontar, escribir, limpiarPantalla, montar, pulsar, texto as textoPantalla } from "../../tests/integracion/montar";

if (typeof URL.createObjectURL !== "function") {
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: () => "blob:foto" });
}
if (typeof URL.revokeObjectURL !== "function") {
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: () => undefined });
}

const fila = (parcial: Partial<FilaTareaEvento> = {}): FilaTareaEvento => ({
  id: "tarea-1",
  titulo: "Cajas",
  tipo: "trabajo",
  monto: "8",
  tope: null,
  condicion: "La mesa",
  estado: "pendiente",
  miembroId: "",
  prioridad: "normal",
  dificultad: null,
  bloqueo: null,
  tieneFoto: false,
  ...parcial,
});

test("el inglés y el español cuentan lo mismo sobre el código, la foto y el archivo", () => {
  assert.match(texto("en", "eventos.createCodeHelp"), /HYTO-XXXX/);
  assert.match(texto("en", "eventos.createCodeHelp"), /7 days/);
  assert.match(texto("es", "eventos.createCodeHelp"), /HYTO-XXXX/);
  assert.match(texto("es", "eventos.createCodeHelp"), /7 días/);
  assert.match(texto("en", "eventos.codeHelp"), /HYTO-XXXX/);
  assert.match(texto("es", "eventos.codeHelp"), /HYTO-XXXX/);
  assert.match(texto("en", "confirmar.inviteCodeDetail"), /HYTO-XXXX/);
  assert.match(texto("es", "confirmar.inviteCodeDetail"), /HYTO-XXXX/);
  assert.match(texto("en", "eventos.editPhoto"), /Open the review/);
  assert.match(texto("en", "eventos.editPhoto"), /another one/);
  assert.match(texto("es", "eventos.editPhoto"), /revisión/);
  assert.match(texto("es", "eventos.editPhoto"), /otra/);
  assert.match(texto("en", "evidencia.sendAnother"), /replaces the previous one/);
  assert.match(texto("es", "evidencia.sendAnother"), /reemplaza el anterior/);
  assert.match(texto("en", "evidencia.takeAnotherSent"), /replaces the previous one/);
  assert.match(es.evidencia.takeAnotherSent, /reemplaza la anterior/);
});

test("crear evento sin tareas marca el título y lo enfoca", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 500 })) as typeof fetch;
  try {
    await montar(createElement(CrearProyecto), { push: () => undefined });
    await escribir("#nombre-proyecto", "Feria");
    await pulsar("Create event");
    const titulo = document.querySelector("#titulo-1");
    assert.ok(titulo instanceof HTMLInputElement);
    assert.equal(titulo.getAttribute("aria-invalid"), "true");
    assert.match(document.getElementById("titulo-1-error")?.textContent ?? "", /at least one task/i);
    assert.equal(document.activeElement, titulo);
    assert.doesNotMatch(document.querySelector("aside")?.textContent ?? "", /at least one task/i);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("unirse muestra HYTO-XXXX y el código inválido queda en el campo", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ aviso: "That code is not valid." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  try {
    await montar(createElement(Unirse), { push: () => undefined });
    const codigo = document.querySelector("#codigo-join");
    assert.ok(codigo instanceof HTMLInputElement);
    assert.equal(codigo.placeholder, "HYTO-XXXX");
    assert.match(textoPantalla(), /lasts 7 days/);
    await pulsar("Join");
    assert.equal(codigo.getAttribute("aria-invalid"), "true");
    assert.equal(document.activeElement, codigo);
    assert.match(document.getElementById("codigo-join-error")?.textContent ?? "", /Enter the invite code/);
    await escribir("#codigo-join", "HYTO-NOEXISTE");
    await pulsar("Join");
    assert.equal(codigo.getAttribute("aria-invalid"), "true");
    assert.match(document.getElementById("codigo-join-error")?.textContent ?? "", /not valid/);
    assert.equal(document.activeElement, codigo);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("el panel de invitar explica el código sin moverse de lugar", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(CabeceraEvento, { id: "feria", nombre: "Feria", rol: "organizer", pestana: "inbox" }), {
      push: () => undefined,
    });
    await pulsar("Invite");
    const panel = document.querySelector("[aria-label='Invite']");
    assert.ok(panel);
    assert.match(panel.textContent ?? "", /HYTO-XXXX/);
    assert.match(panel.textContent ?? "", /7 days/);
    assert.match(panel.textContent ?? "", /Create a code/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("una tarea con foto dice qué hacer y el título vacío se marca", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 500 })) as typeof fetch;
  try {
    await montar(createElement(TareasEvento, { tareas: [fila({ bloqueo: AVISO_CON_FOTO, tieneFoto: true })], miembros: [] }), {
      push: () => undefined,
    });
    assert.match(textoPantalla(), /Open the review to check the photo and pay/);
    await desmontar();
    await montar(createElement(TareasEvento, { tareas: [fila()], miembros: [] }), { push: () => undefined });
    await pulsar("Edit");
    const titulo = document.querySelector("#titulo-tarea-1");
    assert.ok(titulo instanceof HTMLInputElement);
    await escribir("#titulo-tarea-1", " ");
    await pulsar("Save");
    assert.equal(titulo.getAttribute("aria-invalid"), "true");
    assert.match(document.getElementById("titulo-tarea-1-error")?.textContent ?? "", /Enter a title/);
    assert.equal(document.activeElement, titulo);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("enviar otro archivo dice que reemplaza el anterior", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  const comida = tareasEjemplo().find((tarea) => tarea.id === "comida");
  assert.ok(comida);
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      return new Response(JSON.stringify({ tareas: [{ ...comida, estado: "en revisión", nota: 64 }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/api/proyectos")) return new Response(JSON.stringify({ proyectos: [] }), { status: 200 });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  try {
    await montar(createElement(SubirEvidencia, { tareaId: "comida" }), { push: () => undefined });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(textoPantalla(), /Send another file \(replaces the previous one\)/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});

test("el nombre vacío de una comunidad y de una cuenta queda en el campo", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let llamados = 0;
  globalThis.fetch = (async () => {
    llamados += 1;
    return new Response(JSON.stringify({ perfil: null }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    await montar(createElement(FormularioComunidad), { push: () => undefined });
    await pulsar("Create community");
    const nombre = document.querySelector("#nombre-comunidad");
    assert.ok(nombre instanceof HTMLInputElement);
    assert.equal(nombre.getAttribute("aria-invalid"), "true");
    assert.match(document.getElementById("nombre-comunidad-error")?.textContent ?? "", /Enter a community name/);
    assert.equal(document.activeElement, nombre);
    await desmontar();
    llamados = 0;
    await montar(createElement(TipoCuenta), { push: () => undefined });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
    const empresa = document.querySelector<HTMLInputElement>("#tipo-cuenta-empresa");
    assert.ok(empresa);
    await act(async () => {
      empresa.click();
    });
    await pulsar("Save");
    const comunidad = document.querySelector("#empresa-nombre");
    assert.ok(comunidad instanceof HTMLInputElement);
    assert.equal(comunidad.getAttribute("aria-invalid"), "true");
    assert.match(document.getElementById("empresa-nombre-error")?.textContent ?? "", /Enter the community name/);
    assert.equal(document.activeElement, comunidad);
    assert.equal(llamados > 0, true);
    await desmontar();
    await montar(createElement(UnirseCodigo), { push: () => undefined });
    await pulsar("Join");
    const codigo = document.querySelector("#codigo-comunidad");
    assert.ok(codigo instanceof HTMLInputElement);
    assert.equal(codigo.getAttribute("aria-invalid"), "true");
    assert.equal(document.activeElement, codigo);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
