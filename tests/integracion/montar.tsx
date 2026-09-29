import "./dom-global";
import { createElement, type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createRequire } from "node:module";

type Proveedor = (props: { value: unknown; children?: ReactNode }) => ReactNode;

const requerir = createRequire(import.meta.url);
const contextos = requerir("next/dist/shared/lib/app-router-context.shared-runtime.js") as {
  AppRouterContext: { Provider: Proveedor };
};
const rutas = requerir("next/dist/shared/lib/hooks-client-context.shared-runtime.js") as {
  PathnameContext: { Provider: Proveedor };
};

let raiz: Root | null = null;

export async function desmontar(): Promise<void> {
  if (!raiz) return;
  const actual = raiz;
  raiz = null;
  await act(async () => {
    actual.unmount();
  });
}

export async function montar(
  nodo: ReactNode,
  opciones?: { ruta?: string; push?: (href: string) => void },
): Promise<void> {
  await desmontar();
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  raiz = root;
  let arbol = nodo;
  if (opciones?.ruta !== undefined) {
    arbol = createElement(rutas.PathnameContext.Provider, { value: opciones.ruta }, arbol);
  }
  if (opciones?.push) {
    arbol = createElement(contextos.AppRouterContext.Provider, { value: { push: opciones.push } }, arbol);
  }
  await act(async () => {
    root.render(arbol);
  });
}

export function texto(): string {
  return document.body.textContent ?? "";
}

export async function escribir(selector: string, valor: string): Promise<void> {
  const nodo = document.querySelector(selector);
  if (!(nodo instanceof HTMLInputElement)) throw new Error(`No está ${selector}.`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(nodo, valor);
    nodo.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export async function pulsar(textoBoton: string): Promise<void> {
  const boton = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(textoBoton));
  if (!boton) throw new Error(`Sin botón ${textoBoton}.`);
  await act(async () => {
    boton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

export function limpiarPantalla(): void {
  document.body.replaceChildren();
  window.localStorage.clear();
}
