import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Marco } from "@/components/admin/Marco";
import { ProveedorModoDemo } from "@/components/sesion/InsigniaDemo";
import { ProveedorIdioma } from "@/components/ui/Idioma";
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
    assert.equal(document.documentElement.getAttribute("data-ayuda-mile"), "abierta");
    const capa = document.querySelector(".hyto-capa-ayuda");
    assert.equal(capa?.parentElement, document.body);
    assert.equal(capa?.closest(".hyto-shell"), null);
    const preguntas = [...document.querySelectorAll(".hyto-preguntar")];
    assert.ok(preguntas.length >= 1);
    for (const boton of preguntas) {
      assert.equal(boton.querySelector(".hyto-mile"), null);
      assert.ok(boton.querySelector(".hyto-isotipo"));
    }
    const panel = document.querySelector(".hyto-ayuda");
    assert.match(texto(), /How do I get paid\?/);
    assert.match(texto(), /How do I set money aside for a task\?/);
    assert.match(texto(), /What does it cost to pay a task\?/);
    await pulsar("Frequently asked questions");
    assert.match(texto(), /How do I pay a reimbursement\?/);
    // Reduced motion: Mile's bubbles arrive at once.
    const matchMedia = window.matchMedia;
    window.matchMedia = ((consulta: string) => ({ matches: consulta.includes("prefers-reduced-motion"), media: consulta })) as typeof window.matchMedia;
    try {
      await pulsar("How do I get paid?");
    } finally {
      window.matchMedia = matchMedia;
    }
    assert.equal(document.querySelector(".hyto-ayuda"), panel);
    assert.equal(panel?.parentElement, capa);
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
    const datos = document.querySelector(".hyto-foot .hyto-usuario-datos");
    assert.equal(datos?.textContent, "Volunteer (demo)");
    assert.equal(datos?.getAttribute("title"), "voluntario@hyto.demo");
    await desmontar();
    await montar(
      createElement(Marco, {
        usuario: { nombre: null, email: "ana@hyto.dev" },
        children: createElement("p", null, "inicio"),
      }),
      { ruta: "/mis-tareas" },
    );
    const soloCorreo = document.querySelector(".hyto-foot .hyto-usuario-datos");
    assert.equal(soloCorreo?.textContent, "ana@hyto.dev");
    assert.equal(soloCorreo?.getAttribute("title"), "ana@hyto.dev");
    await pulsar("ana@hyto.dev");
    const delCorreo = [...document.querySelectorAll(".hyto-usuario-iniciales")].map((nodo) => nodo.textContent?.trim());
    assert.ok(delCorreo.every((letra) => letra === "A"));
    assert.equal(delCorreo.length, 3);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("la barra del organizador solo tiene Eventos y Mis tareas, en escritorio y en el móvil", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorModoDemo, {
        activo: true,
        rol: "organizador",
        children: createElement(Marco, {
          usuario: { nombre: "Organizer (demo)", email: "org@hyto.demo" },
          eventosOrganizados: ["demo"],
          children: createElement("p", null, "inicio"),
        }),
      }),
      { ruta: "/eventos/demo/informe" },
    );
    const escritorio = [...(document.querySelector(".hyto-nav-escritorio")?.querySelectorAll("a") ?? [])];
    assert.deepEqual(
      escritorio.map((enlace) => enlace.getAttribute("href")),
      ["/eventos", "/mis-tareas"],
    );
    assert.equal(escritorio[0]?.getAttribute("aria-current"), "page");
    const iconos = escritorio.map((enlace) => enlace.querySelector("svg path")?.getAttribute("d"));
    assert.equal(new Set(iconos).size, 2);
    assert.equal(document.querySelectorAll(".hyto-nav-grupo").length, 0);
    assert.doesNotMatch(texto(), /Your event|Your work|Join an event|Inbox|Event tasks/);
    const movil = [...(document.querySelector(".hyto-nav-movil")?.querySelectorAll("a") ?? [])].map((enlace) => enlace.getAttribute("href"));
    assert.deepEqual(movil, ["/eventos", "/mis-tareas"]);
    const barra = [...document.querySelectorAll(".hyto-side nav a")].map((enlace) => enlace.getAttribute("href") ?? "");
    assert.ok(barra.every((href) => !/\/informe|^\/eventos\/[^/]+|^\/join/.test(href)), barra.join(", "));
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
    const preguntar = pie?.querySelector(".hyto-preguntar");
    assert.equal(preguntar?.querySelector(".hyto-preguntar-texto")?.textContent, "Ask Mile");
    assert.equal(preguntar?.getAttribute("title"), "Ask Mile (Ctrl+K)");
    assert.equal(preguntar?.querySelector("kbd")?.textContent, "Ctrl+K");
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
    const plegados = [...document.querySelectorAll(".hyto-nav-escritorio a")];
    assert.deepEqual(
      plegados.map((enlace) => enlace.getAttribute("title")),
      ["Projects", "My tasks"],
    );
    assert.equal(new Set(plegados.map((enlace) => enlace.querySelector("svg path")?.getAttribute("d"))).size, 2);

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

test("en el teléfono el menú del encabezado ofrece Notes, y en español Notas", async () => {
  limpiarPantalla();
  try {
    await montar(createElement(Marco, { usuario: { nombre: "Ana Solís", email: "ana@hyto.dev" }, children: createElement("p", null, "inicio") }), {
      ruta: "/eventos/demo/tareas",
    });
    const boton = document.querySelector(".hyto-encabezado-mas-boton");
    assert.equal(boton?.getAttribute("aria-label"), "More");
    assert.equal(boton?.closest(".hyto-solo-movil")?.classList.contains("hyto-brand-acciones"), true);
    assert.equal(document.querySelector(".hyto-encabezado-mas-menu"), null);
    await act(async () => {
      boton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const menu = document.querySelector(".hyto-encabezado-mas-menu");
    assert.equal(menu?.getAttribute("role"), "menu");
    const notas = menu?.querySelector('[role="menuitem"]');
    assert.equal(notas?.textContent, "Notes");
    assert.equal(notas?.getAttribute("href"), "/mis-tareas");
    assert.equal(notas?.classList.contains("hyto-perfil-item"), true);
    assert.equal(notas?.querySelector("svg path")?.getAttribute("d"), "M5 6h10M5 10h10M5 14h6");
    await desmontar();
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(Marco, {
          usuario: { nombre: "Ana Solís", email: "ana@hyto.dev" },
          children: createElement("p", null, "inicio"),
        }),
      }),
      { ruta: "/eventos/demo/tareas" },
    );
    const mas = document.querySelector(".hyto-encabezado-mas-boton");
    assert.equal(mas?.getAttribute("aria-label"), "Más");
    await act(async () => {
      mas?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    assert.equal(document.querySelector(".hyto-encabezado-mas-menu [role='menuitem']")?.textContent, "Notas");
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});

test("sin nombre, el menú de la cuenta dice Su cuenta y el correo va en la segunda línea", async () => {
  limpiarPantalla();
  try {
    await montar(
      createElement(ProveedorIdioma, {
        idioma: "es",
        children: createElement(Marco, {
          usuario: { nombre: null, email: "ana.larga@hyto.dev" },
          children: createElement("p", null, "inicio"),
        }),
      }),
      { ruta: "/eventos" },
    );
    await pulsar("ana.larga@hyto.dev");
    const menu = document.querySelector('[role="dialog"].hyto-perfil-menu');
    assert.ok(menu);
    assert.equal(menu.querySelector("strong")?.textContent, "Su cuenta");
    assert.match(menu.textContent ?? "", /ana\.larga@hyto\.dev/);
  } finally {
    await desmontar();
    limpiarPantalla();
  }
});
