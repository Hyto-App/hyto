import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { MisTareas } from "@/components/integrante/MisTareas";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";
import { INTERVALO_SEGUIMIENTO_MS, LIMITE_SEGUIMIENTO_MS } from "./seguimiento";
import type { Tarea } from "./tipos";

const TAREAS: Tarea[] = [
  {
    id: "alta",
    proyectoId: "uno",
    titulo: "Booth",
    tipo: "trabajo",
    monto: "30",
    tope: null,
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado: "pagado",
    prioridad: "normal",
    dificultad: "hard",
  },
  {
    id: "media",
    proyectoId: "dos",
    titulo: "Check-in",
    tipo: "trabajo",
    monto: "20",
    tope: "99",
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado: "pendiente",
    prioridad: "high",
    dificultad: "medium",
  },
  {
    id: "comida",
    proyectoId: "uno",
    titulo: "Meal",
    tipo: "reembolso",
    monto: "8",
    tope: "30",
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado: "pendiente",
    prioridad: "high",
    dificultad: "easy",
  },
  {
    id: "vacio",
    proyectoId: "dos",
    titulo: "Blank",
    tipo: "trabajo",
    monto: "",
    tope: null,
    condicion: "",
    miembroId: "v",
    walletCobro: "",
    estado: "pendiente",
    prioridad: "normal",
    dificultad: null,
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function titulos(): string[] {
  return [...document.querySelectorAll("h3")].map((nodo) => nodo.textContent ?? "");
}

function insignias(): string[] {
  return [...document.querySelectorAll("article")]
    .filter((nodo) => nodo.textContent?.includes("Best paid"))
    .map((nodo) => nodo.querySelector("h3")?.textContent ?? "");
}

test("Mis tareas marca el mejor pago y ordena sin perder el filtro", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/tareas")) return json({ tareas: TAREAS });
    if (url.startsWith("/api/proyectos")) {
      return json({
        proyectos: [
          { id: "uno", nombre: "North" },
          { id: "dos", nombre: "South" },
        ],
      });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;

  try {
    await montar(createElement(MisTareas));
    await esperar(() => texto().includes("Booth") && texto().includes("Blank"));

    await pulsar("Sort");
    const orden = document.querySelector("[aria-label='Sort tasks']");
    assert.ok(orden);
    assert.equal(orden?.querySelectorAll("button").length, 3);
    assert.deepEqual(
      [...(orden?.querySelectorAll("button") ?? [])].map((boton) => boton.textContent),
      ["Priority", "Highest pay", "Default"],
    );
    assert.equal(orden?.querySelector("[aria-checked='true']")?.textContent, "Default");
    await pulsar("Default");
    assert.equal(document.querySelector("[aria-label='Sort tasks']"), null);
    assert.deepEqual(titulos(), ["Booth", "Meal", "Check-in", "Blank"]);
    assert.deepEqual(insignias().sort(), ["Booth", "Meal"]);
    for (const insignia of document.querySelectorAll("article .hyto-pill-ok")) {
      if (!insignia.textContent?.includes("Best paid")) continue;
      assert.match(insignia.className, /hyto-pill /);
      assert.equal(insignia.className.includes("hyto-pill-bad"), false);
    }

    await pulsar("Pending");
    assert.deepEqual(titulos(), ["Check-in", "Blank", "Meal"]);
    assert.deepEqual(insignias(), ["Meal"]);

    await pulsar("Sort");
    await pulsar("Highest pay");
    await pulsar("Sort");
    assert.equal(document.querySelector("[aria-label='Sort tasks'] [aria-checked='true']")?.textContent, "Highest pay");
    await pulsar("Highest pay");
    assert.deepEqual(titulos(), ["Meal", "Check-in", "Blank"]);

    await pulsar("All");
    assert.deepEqual(titulos(), ["Booth", "Meal", "Check-in", "Blank"]);

    const booth = [...document.querySelectorAll("article")].find((nodo) => nodo.querySelector("h3")?.textContent === "Booth");
    const checkin = [...document.querySelectorAll("article")].find((nodo) => nodo.querySelector("h3")?.textContent === "Check-in");
    const blank = [...document.querySelectorAll("article")].find((nodo) => nodo.querySelector("h3")?.textContent === "Blank");
    const boothAltas = [...(booth?.querySelectorAll(".hyto-pill-ok") ?? [])].map((nodo) => nodo.textContent ?? "");
    assert.equal(boothAltas.some((textoPildora) => textoPildora.includes("High priority")), false);
    assert.match(booth?.querySelector(".hyto-pill-muted")?.textContent ?? "", /Hard/);
    assert.equal(booth?.querySelector(".hyto-pill-muted")?.className.includes("hyto-pill-bad"), false);
    assert.match(checkin?.querySelector(".hyto-pill-ok")?.textContent ?? "", /High priority/);
    assert.match(checkin?.textContent ?? "", /Medium/);
    assert.equal(checkin?.querySelector(".hyto-pill-ok")?.className.includes("hyto-pill "), true);
    assert.equal(blank?.textContent?.includes("High priority"), false);
    assert.equal(/\b(Easy|Medium|Hard)\b/.test(blank?.textContent ?? ""), false);

    await pulsar("Sort");
    await pulsar("Priority");
    await pulsar("Sort");
    assert.equal(document.querySelector("[aria-label='Sort tasks'] [aria-checked='true']")?.textContent, "Priority");
    await pulsar("Priority");
    assert.deepEqual(titulos(), ["Check-in", "Meal", "Booth", "Blank"]);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("un veredicto de error no dice que Mile sigue revisando", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/tareas")) {
      return json({
        tareas: [
          {
            id: "fallo",
            proyectoId: "uno",
            titulo: "Receipt",
            tipo: "reembolso",
            monto: "8",
            tope: "15",
            condicion: "",
            miembroId: "v",
            walletCobro: "",
            estado: "en revisión",
            prioridad: "normal",
            dificultad: null,
            nota: null,
            veredicto: null,
            revisionFallida: true,
            tipoArchivo: "application/pdf",
          },
        ],
      });
    }
    if (url.startsWith("/api/proyectos")) return json({ proyectos: [{ id: "uno", nombre: "North" }] });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(MisTareas));
    await esperar(() => texto().includes("Receipt"));
    assert.match(texto(), /Mile couldn't finish — retry/);
    assert.doesNotMatch(texto(), /Mile is checking your photo/);
    assert.doesNotMatch(texto(), /Mile is checking your file/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("una foto reciente en revisión dice que Mile sigue, y al llegar la nota la muestra", async () => {
  const anterior = globalThis.fetch;
  let lecturas = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/tareas")) {
      lecturas += 1;
      return json({
        tareas: [
          {
            id: "stand",
            proyectoId: "uno",
            titulo: "Booth",
            tipo: "trabajo",
            monto: "20",
            tope: "20",
            condicion: "",
            miembroId: "v",
            walletCobro: "",
            estado: "en revisión",
            prioridad: "normal",
            dificultad: null,
            nota: lecturas > 1 ? 84 : null,
            veredicto: lecturas > 1 ? "cumplió" : null,
            enviadaEn: new Date().toISOString(),
          },
        ],
      });
    }
    if (url.startsWith("/api/proyectos")) return json({ proyectos: [{ id: "uno", nombre: "North" }] });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(MisTareas));
    await esperar(() => texto().includes("Still reviewing"));
    assert.match(texto(), /Mile is checking your photo/);
    assert.doesNotMatch(texto(), /Mile couldn't finish/);
    assert.equal(document.querySelector('a[href="/tareas/stand"]')?.textContent, "View task");
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, INTERVALO_SEGUIMIENTO_MS + 400));
    });
    assert.ok(lecturas >= 2);
    assert.match(texto(), /84% · Completed/);
    assert.doesNotMatch(texto(), /Still reviewing/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("una foto en revisión ya vieja ofrece reintentar", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/tareas")) {
      return json({
        tareas: [
          {
            id: "stand",
            proyectoId: "uno",
            titulo: "Booth",
            tipo: "trabajo",
            monto: "20",
            tope: "20",
            condicion: "",
            miembroId: "v",
            walletCobro: "",
            estado: "en revisión",
            prioridad: "normal",
            dificultad: null,
            nota: null,
            veredicto: null,
            enviadaEn: new Date(Date.now() - LIMITE_SEGUIMIENTO_MS - 5_000).toISOString(),
          },
        ],
      });
    }
    if (url.startsWith("/api/proyectos")) return json({ proyectos: [{ id: "uno", nombre: "North" }] });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(MisTareas));
    await esperar(() => texto().includes("Booth"));
    assert.match(texto(), /Mile couldn't finish — retry/);
    assert.doesNotMatch(texto(), /Still reviewing/);
    assert.doesNotMatch(texto(), /Mile is checking your photo/);
    assert.equal(document.querySelector('a[href="/tareas/stand"]')?.textContent, "Try again");
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("quien cobra ve el pedido de otra foto y lo que Mile leyó junto a lo que le van a pagar", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/tareas")) {
      return json({
        tareas: [
          {
            id: "comida",
            proyectoId: "uno",
            titulo: "Meal",
            tipo: "reembolso",
            monto: "0.25",
            tope: "0.25",
            condicion: "",
            miembroId: "v",
            walletCobro: "",
            estado: "en revisión",
            prioridad: "normal",
            dificultad: null,
            nota: 79,
            veredicto: "parcial",
            montoRevisado: "0.30",
            montoConfirmado: null,
            notas: [
              {
                id: "over_cap",
                texto: "Amount over the cap",
                explicacion: "The amount is over the cap.",
                severidad: "warning",
                preguntas: [],
              },
            ],
          },
          {
            id: "stand",
            proyectoId: "uno",
            titulo: "Booth",
            tipo: "trabajo",
            monto: "20",
            tope: null,
            condicion: "",
            miembroId: "v",
            walletCobro: "",
            estado: "pendiente",
            prioridad: "normal",
            dificultad: null,
            rechazada: true,
            rechazo: { nota: "The banner is cropped", fallidos: [], origen: "organizador" },
            organizador: { nombre: "Ana" },
          },
        ],
      });
    }
    if (url.startsWith("/api/proyectos")) return json({ proyectos: [{ id: "uno", nombre: "North" }] });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(MisTareas));
    await esperar(() => texto().includes("Meal") && texto().includes("Booth"));
    assert.match(texto(), /79%/);
    assert.match(texto(), /Amount over the cap/);
    assert.match(texto(), /Mile read US\$0\.30\. You'll be paid US\$0\.25\./);
    assert.match(texto(), /Ana asked for another photo/);
    assert.match(texto(), /New photo requested/);
    assert.equal(texto().includes("The organizer asked"), false);
    assert.equal(texto().includes("Rejected"), false);
    assert.match(texto(), /The banner is cropped/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 25; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}
