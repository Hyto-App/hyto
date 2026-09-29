import { Window } from "happy-dom";

const ventana = new Window({ url: "http://localhost/" });

const globales: Record<string, unknown> = {
  window: ventana,
  self: ventana,
  document: ventana.document,
  navigator: ventana.navigator,
  HTMLElement: ventana.HTMLElement,
  HTMLInputElement: ventana.HTMLInputElement,
  HTMLButtonElement: ventana.HTMLButtonElement,
  Element: ventana.Element,
  Node: ventana.Node,
  DocumentFragment: ventana.DocumentFragment,
  Event: ventana.Event,
  MouseEvent: ventana.MouseEvent,
  KeyboardEvent: ventana.KeyboardEvent,
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: ventana.requestAnimationFrame.bind(ventana),
  cancelAnimationFrame: ventana.cancelAnimationFrame.bind(ventana),
  getComputedStyle: ventana.getComputedStyle.bind(ventana),
};

if (typeof ventana.InputEvent === "function") globales.InputEvent = ventana.InputEvent;

for (const [clave, valor] of Object.entries(globales)) {
  Object.defineProperty(globalThis, clave, { configurable: true, writable: true, value: valor });
}
