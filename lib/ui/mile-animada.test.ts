import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MileAnimada } from "@/components/ui/MileAnimada";
import { aplicarEstado, ESTADOS_ANIMADOS, RESPALDO_ESTATICO } from "./mile-animado";
import { ESTADOS_MILE } from "./mile";

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
  await act(async () => raiz.render(createElement(MileAnimada, { estado: "reposo", tamano: 200 })));
  assert.ok(contenedor.querySelector(".hyto-mile"), "fallback while loading");
  await esperar();
  assert.equal(contenedor.querySelector(".hyto-mile"), null, "fallback removed once the rig is ready");
  const host = contenedor.querySelector("[data-mile-rig]") as HTMLElement;
  assert.ok(host.querySelector("svg"), "rig svg is mounted");
  assert.notEqual(host.style.display, "none");
  await act(async () => raiz.render(createElement(MileAnimada, { estado: "buscando", tamano: 200 })));
  await esperar(20);
  assert.ok(host.querySelector("svg"), "same rig survives a state change");
  await act(async () => raiz.unmount());
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
  await act(async () => raiz.render(createElement(MileAnimada, { onToque: (r) => toques.push(r) })));
  await esperar();
  const boton = contenedor.querySelector('[role="button"]') as HTMLElement;
  assert.ok(boton, "interactive rig exposes role=button");
  await act(async () => boton.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  assert.equal(toques[0], "hey");
  await act(async () => raiz.unmount());
});
