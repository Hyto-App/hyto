import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { AyudaMile } from "@/components/admin/AyudaMile";
import { MisTareas } from "@/components/integrante/MisTareas";
import { ATAJOS } from "@/lib/ui/ayuda";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";
import { RUTA_SUBIR_EVIDENCIA, tareaParaSubir } from "./subir";
import type { Tarea } from "./tipos";

function tarea(id: string, estado: Tarea["estado"], monto: string): Tarea {
  return {
    id,
    proyectoId: "uno",
    titulo: id,
    tipo: "trabajo",
    monto,
    tope: null,
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado,
    prioridad: "normal",
    dificultad: null,
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 25; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}

async function conTareas(tareas: Tarea[], cuerpo: () => Promise<void>): Promise<void> {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/tareas")) return json({ tareas });
    if (url.startsWith("/api/proyectos")) return json({ proyectos: [{ id: "uno", nombre: "North" }] });
    return json({});
  }) as typeof fetch;
  try {
    await cuerpo();
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
}

test("tareaParaSubir elige la primera tarea pendiente, la misma que Mis tareas abre", () => {
  assert.equal(tareaParaSubir([tarea("hecha", "pagado", "9"), tarea("a", "pendiente", "5"), tarea("b", "pendiente", "8")]), "a");
  assert.equal(tareaParaSubir([tarea("a", "pendiente", "5"), tarea("b", "pendiente", "8")], "mayor"), "b");
  assert.equal(tareaParaSubir([tarea("hecha", "pagado", "9"), tarea("rev", "en revisión", "3")]), null);
});

test("el atajo Subir evidencia de Mile ya no apunta a la misma página Mis tareas", async () => {
  const atajo = ATAJOS.find((item) => item.id === "evidencia");
  assert.ok(atajo && "href" in atajo);
  assert.equal(atajo.href, RUTA_SUBIR_EVIDENCIA);
  assert.notEqual(atajo.href, "/mis-tareas");

  limpiarPantalla();
  await montar(createElement(AyudaMile, { abierto: true, alCerrar: () => undefined, devolver: null }));
  const enlace = [...document.querySelectorAll("a.hyto-ayuda-atajo")].find((nodo) => nodo.textContent === "Upload evidence");
  assert.equal(enlace?.getAttribute("href"), "/mis-tareas?subir=1");
  await desmontar();
});

test("Mis tareas con ?subir=1 abre la carga de evidencia de la siguiente tarea pendiente", async () => {
  limpiarPantalla();
  const destinos: string[] = [];
  await conTareas([tarea("pagada", "pagado", "9"), tarea("siguiente", "pendiente", "5"), tarea("otra", "pendiente", "4")], async () => {
    await montar(createElement(MisTareas, { irA: (href: string) => destinos.push(href) }), { busqueda: "subir=1" });
    await esperar(() => destinos.length > 0);
    assert.deepEqual(destinos, ["/tareas/siguiente"]);
  });
});

test("sin ?subir=1, o sin tareas pendientes, Mis tareas no navega sola", async () => {
  limpiarPantalla();
  const destinos: string[] = [];
  await conTareas([tarea("siguiente", "pendiente", "5")], async () => {
    await montar(createElement(MisTareas, { irA: (href: string) => destinos.push(href) }), { busqueda: "" });
    await esperar(() => texto().includes("siguiente"));
    assert.deepEqual(destinos, []);
    const subir = [...document.querySelectorAll("a")].find((nodo) => nodo.textContent?.includes("Upload evidence"));
    assert.equal(subir?.getAttribute("href"), "/tareas/siguiente");
  });
  await conTareas([tarea("rev", "en revisión", "5")], async () => {
    window.history.replaceState(null, "", "/mis-tareas?subir=1");
    await montar(createElement(MisTareas, { irA: (href: string) => destinos.push(href) }), { busqueda: "subir=1" });
    await esperar(() => window.location.search === "");
    assert.deepEqual(destinos, []);
    assert.equal(window.location.pathname, "/mis-tareas");
  });
});
