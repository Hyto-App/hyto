import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Marco } from "@/components/admin/Marco";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, pulsar, texto } from "../../tests/integracion/montar";

test("el avatar abre Configuración, la ayuda y cerrar sesión", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(Marco, { usuario: { nombre: "Ana Solís", email: "ana@hyto.dev" }, children: createElement("p", null, "inicio") }), {
      ruta: "/mis-tareas",
    });
    assert.equal(document.querySelector('a[href="/configuracion"]'), null);
    assert.equal(document.querySelector('a[href="/privacy"]'), null);
    assert.equal(document.querySelector(".hyto-foot-privacidad"), null);
    assert.equal(document.querySelectorAll(".hyto-preguntar-mile").length, 2);
    assert.equal(document.querySelectorAll(".hyto-perfil-flecha").length, 1);
    await pulsar("Ana Solís");
    assert.ok(document.querySelector('a[href="/configuracion"]'));
    assert.ok(document.querySelector('a[href="/privacy"]'));
    const opciones = [...document.querySelectorAll("#hyto-perfil .hyto-perfil-item")];
    assert.equal(opciones.length, 4);
    assert.ok(opciones.every((opcion) => opcion.querySelector("svg")));
    assert.match(texto(), /Sign out/);
    assert.match(texto(), /Help and frequently asked questions/);
    const dialogo = document.querySelector("#hyto-perfil");
    assert.equal(dialogo?.getAttribute("role"), "dialog");
    assert.equal(dialogo?.getAttribute("aria-modal"), "true");
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    assert.equal(document.querySelector("#hyto-perfil"), null);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    });
    assert.match(texto(), /Ask Mile/);
    assert.match(texto(), /How do I get paid\?/);
    assert.match(texto(), /How do I set money aside for a task\?/);
    assert.match(texto(), /What does it cost to pay a task\?/);
    assert.match(texto(), /How do I pay a reimbursement\?/);
    await pulsar("How do I get paid?");
    assert.match(texto(), /cannot send that balance to a bank/);
    assert.doesNotMatch(texto(), /Mile does not sign/);
    assert.doesNotMatch(texto(), /escrow|testnet/i);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("el avatar usa solo letras y cae al correo", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(Marco, {
        usuario: { nombre: "Volunteer (demo)", email: "voluntario@hyto.demo" },
        children: createElement("p", null, "inicio"),
      }),
      { ruta: "/mis-tareas" },
    );
    const letras = [...document.querySelectorAll(".hyto-usuario-iniciales")].map((nodo) => nodo.textContent?.trim());
    assert.deepEqual(letras, ["V", "V"]);
    await desmontar();
    await montar(
      createElement(Marco, {
        usuario: { nombre: null, email: "ana@hyto.dev" },
        children: createElement("p", null, "inicio"),
      }),
      { ruta: "/mis-tareas" },
    );
    await pulsar("ana@hyto.dev");
    const delCorreo = [...document.querySelectorAll(".hyto-usuario-iniciales")].map((nodo) => nodo.textContent?.trim());
    assert.ok(delCorreo.every((letra) => letra === "A"));
    assert.equal(delCorreo.length, 3);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("el organizador ve sus secciones arriba y Eventos va primero en el móvil", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "organizador",
        children: createElement(Marco, {
          usuario: { nombre: "Organizer (demo)", email: "org@hyto.demo" },
          children: createElement("p", null, "inicio"),
        }),
      }),
      { ruta: "/mis-tareas" },
    );
    const escritorio = [...(document.querySelector(".hyto-nav-escritorio")?.querySelectorAll("a") ?? [])].map((enlace) =>
      enlace.getAttribute("href"),
    );
    assert.deepEqual(escritorio, [
      "/eventos",
      "/eventos/demo",
      "/eventos/demo/informe",
      "/eventos/demo/tareas",
      "/mis-tareas",
      "/join",
    ]);
    assert.match(texto(), /Your event/);
    assert.match(texto(), /Inbox/);
    assert.match(texto(), /Event tasks/);
    const movil = [...(document.querySelector(".hyto-nav-movil")?.querySelectorAll("a") ?? [])].map((enlace) => enlace.getAttribute("href"));
    assert.equal(movil[0], "/eventos");
    assert.deepEqual(movil, escritorio);
    assert.equal(document.querySelector('a[href="/comunidades"]'), null);
    const letras = [...document.querySelectorAll(".hyto-usuario-iniciales")].map((nodo) => nodo.textContent?.trim());
    assert.ok(letras.every((letra) => letra === "O"));
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("el enlace de comunidades solo aparece con el interruptor encendido", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(Marco, {
        usuario: { nombre: "Ana", email: "ana@hyto.dev" },
        mostrarComunidades: true,
        children: createElement("p", null, "inicio"),
      }),
      { ruta: "/comunidades" },
    );
    const enlaces = [...document.querySelectorAll('a[href="/comunidades"]')];
    assert.ok(enlaces.length >= 1);
    assert.equal(enlaces[0]?.getAttribute("aria-current"), "page");
    assert.match(texto(), /Communities/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("la barra recuerda si está minimizada y Ctrl+K sigue abriendo a Mile", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(Marco, { usuario: { nombre: "Ana Solís", email: "ana@hyto.dev" }, children: createElement("p", null, "inicio") }), {
      ruta: "/mis-tareas",
    });
    const pie = document.querySelector(".hyto-foot-escritorio");
    const piezas = [...(pie?.children ?? [])].map((nodo) => nodo.className);
    assert.deepEqual(piezas, ["hyto-preguntar", "hyto-brand-acciones hyto-foot-acciones", "hyto-perfil-boton"]);
    const acciones = [...(pie?.querySelectorAll(".hyto-foot-acciones > *") ?? [])].map((nodo) => nodo.className);
    assert.deepEqual(acciones, ["hyto-idioma-menu hyto-idioma-marco", "hyto-tema"]);
    assert.equal(pie?.querySelector('a[href="/privacy"]'), null);
    const toggle = document.querySelector(".hyto-barra-toggle");
    assert.equal(toggle?.classList.contains("hyto-solo-escritorio"), true);
    assert.equal(toggle?.querySelector("svg")?.getAttribute("width"), "18");
    assert.equal(toggle?.getAttribute("aria-label"), "Collapse the sidebar");
    assert.equal(document.querySelector(".hyto-shell")?.classList.contains("is-barra-colapsada"), false);
    const tareas = document.querySelector('.hyto-nav-escritorio a[href="/mis-tareas"]');
    assert.equal(tareas?.getAttribute("aria-label"), null);

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(window.localStorage.getItem("hyto-barra"), "colapsada");
    assert.equal(document.documentElement.dataset.barra, "colapsada");
    assert.equal(document.querySelector(".hyto-shell")?.classList.contains("is-barra-colapsada"), true);
    assert.equal(document.querySelector(".hyto-barra-toggle")?.getAttribute("aria-label"), "Expand the sidebar");
    assert.equal(document.querySelector('.hyto-nav-escritorio a[href="/mis-tareas"]')?.getAttribute("aria-label"), "My tasks");
    assert.equal(document.querySelector('.hyto-nav-escritorio a[href="/mis-tareas"]')?.getAttribute("title"), "My tasks");
    assert.equal(document.querySelector(".hyto-nav-movil a")?.getAttribute("aria-label"), null);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    });
    assert.match(texto(), /How do I get paid\?/);
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    assert.doesNotMatch(texto(), /How do I get paid\?/);

    await desmontar();
    await montar(createElement(Marco, { usuario: { nombre: "Ana Solís", email: "ana@hyto.dev" }, children: createElement("p", null, "inicio") }), {
      ruta: "/eventos",
    });
    assert.equal(document.querySelector(".hyto-shell")?.classList.contains("is-barra-colapsada"), true);
    assert.equal(document.querySelector(".hyto-barra-toggle")?.getAttribute("aria-pressed"), "true");
    await act(async () => {
      document.querySelector(".hyto-barra-toggle")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(window.localStorage.getItem("hyto-barra"), "expandida");
    assert.equal(document.documentElement.dataset.barra, undefined);
    assert.equal(document.querySelector(".hyto-shell")?.classList.contains("is-barra-colapsada"), false);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("el ancho de la barra dura 200 ms y se apaga si hay menos movimiento", () => {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.hyto-shell\s*\{[^}]*transition:\s*grid-template-columns\s+200ms\s+ease/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.hyto-shell\s*\{[^}]*transition:\s*none/);
  const escritorio = css.lastIndexOf("@media (min-width: 1024px)");
  assert.ok(escritorio > 0);
  assert.equal(css.slice(0, escritorio).includes("data-barra"), false);
  assert.match(css.slice(escritorio), /grid-template-columns:\s*72px/);
});
