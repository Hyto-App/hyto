import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
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
    await pulsar("Ana Solís");
    assert.ok(document.querySelector('a[href="/configuracion"]'));
    assert.ok(document.querySelector('a[href="/privacy"]'));
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

test("subir evidencia conserva la navegación y la revisión sigue enfocada", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(Marco, { children: createElement("p", null, "tarea") }), { ruta: "/tareas/stand", push: () => undefined });
    assert.equal(document.querySelector(".hyto-shell-foco"), null);
    assert.ok(document.querySelector(".hyto-nav-movil"));
    assert.ok(document.querySelector('a[href="/mis-tareas"]'));
    await desmontar();
    await montar(createElement(Marco, { children: createElement("p", null, "lista") }), { ruta: "/mis-tareas", push: () => undefined });
    assert.equal(document.querySelector(".hyto-shell-foco"), null);
    assert.ok(document.querySelector(".hyto-nav-movil"));
    await desmontar();
    await montar(createElement(Marco, { children: createElement("p", null, "revision") }), { ruta: "/revision/stand", push: () => undefined });
    assert.ok(document.querySelector(".hyto-shell-foco"));
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
