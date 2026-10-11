import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Tema } from "@/components/ui/Marca";
import { TEMA_BOOT, TEMA_CLAVE, temaInicial } from "@/lib/ui/tema";
import { desmontar, limpiarPantalla, montar } from "../../tests/integracion/montar";

function preferencia(claro: boolean) {
  const anterior = window.matchMedia;
  window.matchMedia = ((consulta: string) => ({
    matches: consulta.includes("prefers-color-scheme: light") ? claro : false,
    media: consulta,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
    onchange: null,
    addListener() {},
    removeListener() {},
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = anterior;
  };
}

test("el tema guardado gana, y sin ninguno manda prefers-color-scheme", () => {
  assert.equal(temaInicial("light", false), "light");
  assert.equal(temaInicial("dark", true), "dark");
  assert.equal(temaInicial(null, true), "light");
  assert.equal(temaInicial(null, false), "dark");
  assert.equal(temaInicial("", true), "light");
  assert.equal(temaInicial("otro", false), "dark");
});

test("el script de arranque pinta claro con el sistema y no pisa un tema guardado", () => {
  const restaurar = preferencia(true);
  const meta = document.createElement("meta");
  meta.setAttribute("name", "theme-color");
  document.head.appendChild(meta);
  try {
    window.localStorage.removeItem(TEMA_CLAVE);
    document.documentElement.setAttribute("data-theme", "dark");
    window.eval(TEMA_BOOT);
    assert.equal(document.documentElement.getAttribute("data-theme"), "light");
    assert.equal(meta.getAttribute("content"), "#F5F6FA");

    window.localStorage.setItem(TEMA_CLAVE, "dark");
    window.eval(TEMA_BOOT);
    assert.equal(document.documentElement.getAttribute("data-theme"), "dark");
    assert.equal(meta.getAttribute("content"), "#0E1024");

    window.localStorage.setItem(TEMA_CLAVE, "light");
    preferencia(false);
    window.eval(TEMA_BOOT);
    assert.equal(document.documentElement.getAttribute("data-theme"), "light");
  } finally {
    meta.remove();
    window.localStorage.removeItem(TEMA_CLAVE);
    document.documentElement.setAttribute("data-theme", "dark");
    restaurar();
  }
});

test("la página usa ese script y el botón no vuelve a forzar oscuro", async () => {
  const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /TEMA_BOOT/);
  assert.doesNotMatch(layout, /if\(t!=="light"\)/);
  const marca = readFileSync(new URL("../../components/ui/Marca.tsx", import.meta.url), "utf8");
  assert.match(marca, /temaInicial\(/);

  const restaurar = preferencia(true);
  limpiarPantalla();
  try {
    window.localStorage.removeItem(TEMA_CLAVE);
    await montar(createElement(Tema));
    await act(async () => {
      await Promise.resolve();
    });
    assert.equal(document.documentElement.getAttribute("data-theme"), "light");
    window.localStorage.setItem(TEMA_CLAVE, "dark");
    await desmontar();
    await montar(createElement(Tema));
    await act(async () => {
      await Promise.resolve();
    });
    assert.equal(document.documentElement.getAttribute("data-theme"), "dark");
  } finally {
    await desmontar();
    limpiarPantalla();
    document.documentElement.setAttribute("data-theme", "dark");
    restaurar();
  }
});
