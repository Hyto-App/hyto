import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { aplicarEstado, ESTADOS_ANIMADOS, RESPALDO_ESTATICO } from "./mile-animado";
import { ESTADOS_MILE } from "./mile";
import MileRig from "./mile-rig";

const esperar = (ms = 80) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

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

test("mounts the rig, swaps the fallback out and changes state", async () => {
  const { contenedor, raiz } = montar();
  try {
    // A sync act runs the effect but cannot wait for the rig's dynamic import, so the fallback is
    // still there. An async act let a fast import finish first and the check failed on CI.
    act(() => raiz.render(createElement(MileAnimada, { estado: "reposo", tamano: 200 })));
    assert.ok(contenedor.querySelector(".hyto-mile"), "fallback while loading");
    await esperar();
    assert.equal(contenedor.querySelector(".hyto-mile"), null, "fallback removed once the rig is ready");
    const host = contenedor.querySelector("[data-mile-rig]") as HTMLElement;
    assert.ok(host.querySelector("svg"), "rig svg is mounted");
    assert.notEqual(host.style.display, "none");
    await act(async () => raiz.render(createElement(MileAnimada, { estado: "buscando", tamano: 200 })));
    await esperar(20);
    assert.ok(host.querySelector("svg"), "same rig survives a state change");
  } finally {
    // Unmount even on failure: a rig left running keeps calling requestAnimationFrame and breaks the frame-count tests below.
    await act(async () => raiz.unmount());
  }
});

test("unmounting destroys the rig", async () => {
  const { contenedor, raiz } = montar();
  await act(async () => raiz.render(createElement(MileAnimada, { estado: "pagado" })));
  await esperar();
  const host = contenedor.querySelector("[data-mile-rig]") as HTMLElement;
  assert.ok(host.querySelector("svg"));
  await act(async () => raiz.unmount());
  assert.equal(host.querySelector("svg"), null, "destroy() removed the svg");
});

test("onToque makes Mile a button and reports the reaction", async () => {
  const toques: string[] = [];
  const { contenedor, raiz } = montar();
  try {
    await act(async () => raiz.render(createElement(MileAnimada, { onToque: (r) => toques.push(r) })));
    await esperar();
    const boton = contenedor.querySelector('[role="button"]') as HTMLElement;
    assert.ok(boton, "interactive rig exposes role=button");
    await act(async () => boton.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    assert.equal(toques[0], "hey");
  } finally {
    await act(async () => raiz.unmount());
  }
});

function espiarRaf() {
  const g = globalThis as unknown as { requestAnimationFrame: (f: FrameRequestCallback) => number };
  const original = g.requestAnimationFrame;
  const contador = { llamadas: 0 };
  g.requestAnimationFrame = (f) => {
    contador.llamadas++;
    return original(f);
  };
  return { contador, restaurar: () => void (g.requestAnimationFrame = original) };
}

test("the loop stops once the idle motion fades and wakes on interaction", async () => {
  const espia = espiarRaf();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const rig = MileRig.create(host, { chest: "peek", idleSeconds: 0.1, reduced: false });
  assert.equal(rig.running, true);
  await new Promise((r) => setTimeout(r, 2200));
  assert.equal(rig.running, false, "loop sleeps after the idle time");
  const llamadas = espia.contador.llamadas;
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(espia.contador.llamadas, llamadas, "no more animation frames while asleep");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
  assert.equal(rig.running, true, "document interaction wakes it");
  await new Promise((r) => setTimeout(r, 2200));
  assert.equal(rig.running, false, "and it sleeps again");
  rig.mood("happy");
  assert.equal(rig.running, true, "a state change wakes it too");
  rig.destroy();
  assert.equal(rig.running, false);
  espia.restaurar();
});

test("with reduced motion there is no loop at all, states change at once", async () => {
  const espia = espiarRaf();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const rig = MileRig.create(host, { chest: "peek", reduced: true });
  assert.equal(rig.running, false);
  rig.mood("sad");
  rig.search();
  rig.reveal("happy");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(rig.running, false);
  assert.equal(espia.contador.llamadas, 0, "requestAnimationFrame is never called");
  rig.destroy();
  espia.restaurar();
});
