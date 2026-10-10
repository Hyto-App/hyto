import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { aplicarEstado, ESTADOS_ANIMADOS, RESPALDO_ESTATICO } from "./mile-animado";
import { ESTADOS_MILE } from "./mile";
import MileRig from "./mile-rig";

const esperar = (ms = 80) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

/** Happy-dom runs requestAnimationFrame on setImmediate, so a live rig can
 *  burn tens of thousands of frames before the idle timeout. These tests
 *  drive the clock themselves and never share that loop with another test. */
function relojRaf() {
  const g = globalThis as typeof globalThis & {
    requestAnimationFrame: (f: FrameRequestCallback) => number;
    cancelAnimationFrame: (id: number) => void;
  };
  const originalRaf = g.requestAnimationFrame;
  const originalCancel = g.cancelAnimationFrame;
  const originalNow = performance.now.bind(performance);
  let ahora = originalNow();
  let seq = 1;
  const cola = new Map<number, FrameRequestCallback>();
  const contador = { llamadas: 0 };
  g.requestAnimationFrame = (cb) => {
    contador.llamadas++;
    const id = seq++;
    cola.set(id, cb);
    return id;
  };
  g.cancelAnimationFrame = (id) => {
    cola.delete(id);
  };
  performance.now = () => ahora;
  const cuadro = () => {
    const lote = [...cola.values()];
    cola.clear();
    for (const cb of lote) cb(ahora);
  };
  return {
    contador,
    get pendientes() {
      return cola.size;
    },
    avanzar(ms: number, paso = 16) {
      const fin = ahora + ms;
      while (cola.size && ahora < fin) {
        ahora += paso;
        cuadro();
      }
    },
    restaurar() {
      g.requestAnimationFrame = originalRaf;
      g.cancelAnimationFrame = originalCancel;
      performance.now = originalNow;
    },
  };
}

function montar() {
  const contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  const raiz = createRoot(contenedor);
  return { contenedor, raiz };
}

test("each state calls the rig method from the hand-off table", () => {
  const esperado: Record<string, string> = {
    reposo: "mood:neutral",
    saludo: "mood:happy",
    buscando: "search",
    "lo-tengo": "reveal:happy",
    pagado: "reveal:excited",
    parcial: "mood:thinking",
    rechazado: "reveal:sad",
    "error-subida": "mood:worried",
    vacio: "mood:sleepy",
  };
  for (const estado of ESTADOS_ANIMADOS) {
    const llamadas: string[] = [];
    aplicarEstado(
      { mood: (m) => llamadas.push(`mood:${m}`), search: () => llamadas.push("search"), reveal: (r) => llamadas.push(`reveal:${r}`) },
      estado,
    );
    assert.deepEqual(llamadas, [esperado[estado]], estado);
  }
});

test("every animated state has an official static fallback", () => {
  for (const estado of ESTADOS_ANIMADOS) assert.ok((ESTADOS_MILE as readonly string[]).includes(RESPALDO_ESTATICO[estado]), estado);
});

test("server render shows the static fallback and no rig", () => {
  const html = renderToStaticMarkup(createElement(MileAnimada, { estado: "buscando", tamano: 140 }));
  assert.ok(html.includes('src="/mile/mile-buscando-dark.svg"'));
  assert.ok(html.includes('src="/mile/mile-buscando-light.svg"'));
  assert.ok(html.includes("display:none"), "rig host is hidden until it is ready");
});

test("mounts the rig, swaps the fallback out and changes state", async (t) => {
  const { contenedor, raiz } = montar();
  let vivo = true;
  t.after(async () => {
    if (!vivo) return;
    vivo = false;
    await act(async () => raiz.unmount());
  });
  // The dynamic import can resolve inside the same awaited act() on a fast
  // runner. Read the fallback in the commit turn, before that promise runs.
  let fallbackAlCargar = false;
  await act(async () => {
    flushSync(() => {
      raiz.render(createElement(MileAnimada, { estado: "reposo", tamano: 200 }));
    });
    fallbackAlCargar = contenedor.querySelector(".hyto-mile") !== null;
  });
  assert.ok(fallbackAlCargar, "fallback while loading");
  for (let i = 0; i < 40 && contenedor.querySelector(".hyto-mile"); i++) await esperar(15);
  assert.equal(contenedor.querySelector(".hyto-mile"), null, "fallback removed once the rig is ready");
  const host = contenedor.querySelector("[data-mile-rig]") as HTMLElement;
  assert.ok(host.querySelector("svg"), "rig svg is mounted");
  assert.notEqual(host.style.display, "none");
  await act(async () => raiz.render(createElement(MileAnimada, { estado: "buscando", tamano: 200 })));
  assert.ok(host.querySelector("svg"), "same rig survives a state change");
  vivo = false;
  await act(async () => raiz.unmount());
});

test("unmounting destroys the rig", async (t) => {
  const { contenedor, raiz } = montar();
  let vivo = true;
  t.after(async () => {
    if (!vivo) return;
    vivo = false;
    await act(async () => raiz.unmount());
  });
  await act(async () => raiz.render(createElement(MileAnimada, { estado: "pagado" })));
  await esperar();
  const host = contenedor.querySelector("[data-mile-rig]") as HTMLElement;
  assert.ok(host.querySelector("svg"));
  vivo = false;
  await act(async () => raiz.unmount());
  assert.equal(host.querySelector("svg"), null, "destroy() removed the svg");
});

test("onToque makes Mile a button and reports the reaction", async (t) => {
  const toques: string[] = [];
  const { contenedor, raiz } = montar();
  let vivo = true;
  t.after(async () => {
    if (!vivo) return;
    vivo = false;
    await act(async () => raiz.unmount());
  });
  await act(async () => raiz.render(createElement(MileAnimada, { onToque: (r) => toques.push(r) })));
  await esperar();
  const boton = contenedor.querySelector('[role="button"]') as HTMLElement;
  assert.ok(boton, "interactive rig exposes role=button");
  await act(async () => boton.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  assert.equal(toques[0], "hey");
  vivo = false;
  await act(async () => raiz.unmount());
});

function hastaDormir(rig: { running: boolean }, reloj: ReturnType<typeof relojRaf>) {
  for (let i = 0; i < 800 && rig.running; i++) reloj.avanzar(16);
}

test("the loop stops once the idle motion fades and wakes on interaction", (t) => {
  const reloj = relojRaf();
  t.after(() => reloj.restaurar());
  const host = document.createElement("div");
  document.body.appendChild(host);
  t.after(() => host.remove());
  const rig = MileRig.create(host, { chest: "peek", idleSeconds: 0.1, reduced: false });
  t.after(() => rig.destroy());
  assert.equal(rig.running, true);
  assert.ok(reloj.pendientes > 0, "the loop scheduled a frame");
  hastaDormir(rig, reloj);
  assert.equal(rig.running, false, "loop sleeps after the idle time");
  const llamadas = reloj.contador.llamadas;
  reloj.avanzar(200);
  assert.equal(reloj.contador.llamadas, llamadas, "no more animation frames while asleep");
  assert.equal(reloj.pendientes, 0);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
  assert.equal(rig.running, true, "document interaction wakes it");
  hastaDormir(rig, reloj);
  assert.equal(rig.running, false, "and it sleeps again");
  rig.mood("happy");
  assert.equal(rig.running, true, "a state change wakes it too");
  rig.destroy();
  assert.equal(rig.running, false);
  assert.equal(reloj.pendientes, 0);
});

test("with reduced motion there is no loop at all, states change at once", (t) => {
  const reloj = relojRaf();
  t.after(() => reloj.restaurar());
  const host = document.createElement("div");
  document.body.appendChild(host);
  t.after(() => host.remove());
  const rig = MileRig.create(host, { chest: "peek", reduced: true });
  t.after(() => rig.destroy());
  assert.equal(rig.running, false);
  rig.mood("sad");
  rig.search();
  rig.reveal("happy");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
  reloj.avanzar(500);
  assert.equal(rig.running, false);
  assert.equal(reloj.contador.llamadas, 0, "requestAnimationFrame is never called");
  assert.equal(reloj.pendientes, 0);
  rig.destroy();
});
