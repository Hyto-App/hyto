import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { Landing } from "@/components/admin/Landing";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";
import {
  CLAVES_DISCURSO,
  audienciasDiscurso,
  confianzaDiscurso,
  discurso,
  discursoDe,
  discursoEs,
  pasosDiscurso,
} from "./discurso";
import { ProveedorIdioma } from "@/components/ui/Idioma";

const JERGA = /\b(trustline|escrow|soroban|xdr|testnet|mainnet|friendbot|wallet)\b/i;
const FRASES = [
  "Prove your worth,",
  "get paid.",
  "A marketplace of small tasks. You get paid in dollars in crypto (USDC).",
  "Practice network.",
  "This app runs on a practice network for now",
  "Pick a task",
  "Send a photo",
  "Get paid",
  "Volunteers and workers",
  "Organizers",
  "The organizer approves every payment",
  "The AI only suggests",
  "The money is set aside before the work",
  "Try the demo",
  "Sign in",
];

test("el discurso de la landing está en un solo mapa en inglés", () => {
  assert.equal(CLAVES_DISCURSO.length, Object.keys(discurso).length);
  for (const clave of CLAVES_DISCURSO) {
    assert.equal(typeof discurso[clave], "string");
    assert.ok(discurso[clave].trim().length > 0, clave);
    assert.equal(JERGA.test(discurso[clave]), false, `${clave}: ${discurso[clave]}`);
  }
  const unido = Object.values(discurso).join("\n");
  for (const frase of FRASES) assert.ok(unido.includes(frase), frase);
  assert.deepEqual(
    pasosDiscurso().map((paso) => paso.titulo),
    ["Pick a task", "Send a photo", "Get paid"],
  );
  assert.equal(audienciasDiscurso().length, 2);
  assert.equal(confianzaDiscurso().length, 3);
});

test("el discurso en español usa las mismas claves", () => {
  assert.deepEqual(Object.keys(discursoEs).sort(), [...CLAVES_DISCURSO].sort());
  for (const clave of CLAVES_DISCURSO) {
    assert.ok(discursoEs[clave].trim().length > 0, clave);
    assert.notEqual(discursoEs[clave], discurso[clave], clave);
    assert.equal(JERGA.test(discursoEs[clave]), false, `${clave}: ${discursoEs[clave]}`);
  }
  assert.equal(discursoDe("en"), discurso);
  assert.equal(discursoDe("es"), discursoEs);
  const unido = Object.values(discursoEs).join("\n");
  for (const frase of ["Demuestra tu valor,", "Red de práctica.", "Elige una tarea", "Conoce a Mile", "¿Necesito saber de cripto?"]) {
    assert.ok(unido.includes(frase), frase);
  }
});

test("la landing en español muestra el discurso y el selector", async () => {
  await montar(
    createElement(ProveedorIdioma, {
      idioma: "es",
      children: createElement(Landing, { demoHabilitado: false }),
    }),
  );
  try {
    const visible = texto();
    for (const frase of ["Demuestra tu valor,", "Red de práctica.", "Cómo funciona", "Para quién es", "Conoce a Mile", "¿Listo para demostrar lo que vales?", "Entrar"]) {
      assert.ok(visible.includes(frase), frase);
    }
    assert.equal(visible.includes("Prove your worth,"), false);
    assert.equal(visible.includes("Practice network."), false);
    assert.ok(document.querySelector(".hyto-landing-head .hyto-idioma"));
    assert.equal(document.querySelector(".hyto-landing-head .hyto-idioma")?.getAttribute("aria-label"), "Idioma");
  } finally {
    await desmontar();
  }
});

const EN_PAGINA = [
  "Prove your worth,",
  "get paid.",
  "A marketplace of small tasks. You get paid in dollars in crypto (USDC).",
  "Practice network.",
  "This app runs on a practice network for now",
  "Pick a task",
  "Send a photo",
  "Volunteers and workers",
  "Organizers",
  "The AI only suggests",
  "Meet Mile",
  "Do I need to know crypto?",
  "Ready to prove your worth?",
  "Sign in",
];

test("la landing muestra el discurso completo y esconde el demo si está apagado", async () => {
  await montar(createElement(Landing, { demoHabilitado: false }));
  try {
    const visible = texto();
    for (const frase of EN_PAGINA) assert.ok(visible.includes(frase), frase);
    assert.equal(visible.includes("Try the demo"), false);
    assert.equal(document.querySelectorAll("h1").length, 1);
    assert.ok(document.querySelector("main.hyto-landing"));
    assert.ok(document.querySelector(".hyto-landing-hero"));
    assert.ok(document.getElementById("hyto-pasos-title"));
    assert.ok(document.getElementById("hyto-roles-title"));
    assert.ok(document.getElementById("hyto-mile-title"));
    assert.ok(document.getElementById("hyto-faq-title"));
    assert.ok(document.getElementById("hyto-cierre-title"));
    assert.equal(visible.includes("Do small tasks for real events"), false);
    assert.equal(visible.includes("Is this real money?"), false);
    const numeros = [...document.querySelectorAll("ol span[aria-hidden='true']")].map((nodo) => nodo.textContent);
    assert.deepEqual(numeros, ["1", "2", "3"]);
  } finally {
    await desmontar();
  }
});

test("el demo de voluntario pide esa sesión y abre sus tareas", async () => {
  const llamadas: { url: string; body: string }[] = [];
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    llamadas.push({ url: String(input), body: String(init?.body ?? "") });
    return new Response(JSON.stringify({ rol: "voluntario" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  const destinos: string[] = [];
  const asignar = window.location.assign.bind(window.location);
  window.location.assign = ((url: string | URL) => {
    destinos.push(String(url));
  }) as Location["assign"];
  await montar(createElement(Landing, { demoHabilitado: true }));
  try {
    await pulsar("Try the demo");
    await pulsar("As a volunteer");
    assert.deepEqual(llamadas, [{ url: "/api/sesion/demo", body: JSON.stringify({ rol: "voluntario" }) }]);
    assert.deepEqual(destinos, ["/mis-tareas"]);
  } finally {
    globalThis.fetch = anterior;
    window.location.assign = asignar;
    await desmontar();
  }
});

test("probar el demo abre las dos sesiones de práctica", async () => {
  await montar(createElement(Landing, { demoHabilitado: true }));
  try {
    assert.equal(document.getElementById("opciones-demo"), null);
    await pulsar("Try the demo");
    const panel = document.getElementById("opciones-demo");
    assert.ok(panel);
    assert.match(panel.textContent ?? "", /No account needed/);
    assert.ok([...document.querySelectorAll("button")].some((boton) => boton.textContent === "As a volunteer"));
    assert.ok([...document.querySelectorAll("button")].some((boton) => boton.textContent === "As an organizer"));
    const abrir = [...document.querySelectorAll("button")].find((boton) => boton.textContent === "Try the demo");
    assert.equal(abrir?.getAttribute("aria-expanded"), "true");
  } finally {
    await desmontar();
  }
});
