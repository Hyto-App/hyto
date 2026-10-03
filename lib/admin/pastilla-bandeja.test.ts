import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Bandeja } from "@/components/admin/Bandeja";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

test("la pastilla sin nota muestra la palabra y no un porcentaje", async () => {
  await montar(createElement(PastillaVeredicto, { veredicto: "cumplió", nota: null }));
  assert.equal(texto(), "Completed");
  assert.equal(texto().includes("%"), false);
  assert.equal(document.querySelectorAll(".hyto-pill-ok").length, 1);
  await desmontar();
});

test("el porcentaje y la etiqueta van juntos en la pastilla", async () => {
  await montar(createElement(PastillaVeredicto, { veredicto: "cumplió", nota: 84 }));
  const palabra = [...document.querySelectorAll("span")].find((nodo) => nodo.textContent === "84% · Completed");
  assert.match(palabra?.className ?? "", /hyto-pill /);
  assert.match(palabra?.className ?? "", /hyto-pill-ok/);
  await desmontar();

  await montar(createElement(PastillaVeredicto, { veredicto: "insuficiente", nota: 40 }));
  const mala = [...document.querySelectorAll("span")].find((nodo) => nodo.textContent === "40% · Insufficient");
  assert.match(mala?.className ?? "", /hyto-pill-bad/);
  await desmontar();

  await montar(createElement(PastillaVeredicto, { veredicto: "cumplió", nota: 64 }));
  assert.equal(texto(), "64% · Partially completed");
  assert.match(document.querySelector(".hyto-pill")?.className ?? "", /hyto-pill-mid/);
  await desmontar();
});

test("la pastilla anuncia solo el texto final y esconde el número que se anima", async () => {
  await montar(createElement(PastillaVeredicto, { veredicto: "cumplió", nota: 64 }));
  const pill = document.querySelector(".hyto-pill");
  assert.ok(pill instanceof HTMLElement);
  assert.equal(pill.getAttribute("aria-label"), "64% · Partially completed");
  assert.equal(pill.textContent, "64% · Partially completed");
  assert.equal(pill.querySelector(".hyto-pill-vista")?.getAttribute("aria-hidden"), "true");
  assert.equal(pill.querySelector(".hyto-pill-sr")?.getAttribute("aria-hidden"), "true");
  assert.equal(pill.querySelector(".hyto-pill-bar")?.getAttribute("aria-hidden"), "true");
  assert.equal(pill.querySelector(".hyto-pill-bar > span") instanceof HTMLElement, true);
  assert.equal(document.querySelector(".hyto-pill-vista")?.getAttribute("data-etiqueta"), "Partially completed");
  await desmontar();
});

test("sin porcentaje no hay barra", async () => {
  await montar(createElement(PastillaVeredicto, { veredicto: "cumplió", nota: null }));
  assert.equal(document.querySelector(".hyto-pill-bar"), null);
  assert.equal(document.querySelector(".hyto-pill")?.getAttribute("aria-label"), null);
  assert.equal(texto(), "Completed");
  await desmontar();
});

test("con menos movimiento la nota y la barra saltan al valor final", async () => {
  const restaurar = medio(true);
  try {
    await montar(createElement(PastillaVeredicto, { veredicto: "insuficiente", nota: 40 }));
    const pill = document.querySelector(".hyto-pill");
    assert.ok(pill instanceof HTMLElement);
    assert.equal(pill.style.getPropertyValue("--hyto-nota"), "40");
    assert.equal(pill.style.getPropertyValue("--hyto-llenado"), "40");
    assert.equal(pill.getAttribute("aria-label"), "40% · Insufficient");
    assert.equal(texto(), "40% · Insufficient");
  } finally {
    restaurar();
    await desmontar();
  }
});

test("la nota sube desde el valor anterior y el texto final no cambia en el camino", async () => {
  const restaurarMedio = medio(false);
  const reloj = instalarReloj(20_000);
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = createRoot(div);
  try {
    await pintar(root, 64, "cumplió");
    const pill = document.querySelector(".hyto-pill");
    assert.ok(pill instanceof HTMLElement);
    assert.equal(pill.textContent, "64% · Partially completed");
    assert.equal(pill.style.getPropertyValue("--hyto-nota"), "");

    reloj.disparar();
    assert.equal(pill.style.getPropertyValue("--hyto-nota"), "0");
    assert.equal(pill.style.getPropertyValue("--hyto-llenado"), "0.00");
    assert.equal(pill.textContent, "64% · Partially completed");

    reloj.avanzar(600);
    reloj.disparar();
    assert.equal(pill.style.getPropertyValue("--hyto-nota"), "56");
    assert.equal(pill.style.getPropertyValue("--hyto-llenado"), "56.00");
    assert.equal(pill.getAttribute("aria-label"), "64% · Partially completed");

    reloj.avanzar(600);
    reloj.disparar();
    assert.equal(pill.style.getPropertyValue("--hyto-nota"), "64");
    assert.equal(pill.style.getPropertyValue("--hyto-llenado"), "64");
    assert.equal(texto(), "64% · Partially completed");

    await pintar(root, 20, "cumplió");
    assert.equal(pill.getAttribute("aria-label"), "20% · Insufficient");
    assert.equal(pill.textContent, "20% · Insufficient");
    reloj.disparar();
    assert.equal(pill.style.getPropertyValue("--hyto-nota"), "64");
    reloj.avanzar(1200);
    reloj.disparar();
    assert.equal(pill.style.getPropertyValue("--hyto-nota"), "20");
    assert.equal(pill.style.getPropertyValue("--hyto-llenado"), "20");
    assert.match(pill.className, /hyto-pill-bad/);
  } finally {
    await act(async () => {
      root.unmount();
    });
    div.remove();
    reloj.restaurar();
    restaurarMedio();
  }
});

test("el movimiento de la pastilla es corto, ease-out, y se apaga si piden menos movimiento", () => {
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(css, /--hyto-duracion:\s*1\.2s/);
  assert.match(css, /transition:\s*color var\(--hyto-duracion\) ease-out/);
  assert.match(css, /width:\s*calc\(var\(--hyto-llenado\) \* 1%\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.hyto-pill-veredicto,\s*\.hyto-pill-veredicto \.hyto-dot \{\s*transition:\s*none/);
  assert.match(css, /@media print \{[\s\S]*?\.hyto-pill-vista \{\s*display:\s*none/);
  const voluntario = readFileSync("components/integrante/SubirEvidencia.tsx", "utf8");
  assert.equal(voluntario.includes("PastillaVeredicto"), false);
});

test("la bandeja separa las notas 49, 50, 79 y 80", async () => {
  const tareas = [
    fila("n49", "Forty nine", 49),
    fila("n50", "Fifty", 50),
    fila("n79", "Seventy nine", 79),
    fila("n80", "Eighty", 80),
  ];
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") {
      return json({ tareas: tareas.map((tarea) => ({ id: tarea.id, proyectoId: "evt" })) });
    }
    if (url.startsWith("/api/revision/")) {
      const id = decodeURIComponent(url.slice("/api/revision/".length));
      return json({ tarea: tareas.find((tarea) => tarea.id === id), foto: null });
    }
    if (url.startsWith("/api/proyectos")) return json({ proyecto: { nombre: "Feria" } });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;

  try {
    await montar(createElement(Bandeja, { proyectoId: "evt" }));
    await esperar(() => texto().includes("Forty nine") && texto().includes("Eighty"));

    await pulsar("Insufficient");
    assert.match(texto(), /Forty nine/);
    assert.equal(texto().includes("Fifty"), false);
    assert.equal(texto().includes("Seventy nine"), false);
    assert.equal(texto().includes("Eighty"), false);

    await pulsar("Partially completed");
    assert.match(texto(), /Fifty/);
    assert.match(texto(), /Seventy nine/);
    assert.equal(texto().includes("Forty nine"), false);
    assert.equal(texto().includes("Eighty"), false);

    await pulsar("Completed");
    assert.match(texto(), /Eighty/);
    assert.equal(texto().includes("Forty nine"), false);
    assert.equal(texto().includes("Fifty"), false);
    assert.equal(texto().includes("Seventy nine"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

function medio(reducido: boolean): () => void {
  const anterior = window.matchMedia.bind(window);
  window.matchMedia = ((consulta: string) => ({
    matches: reducido && consulta.includes("prefers-reduced-motion"),
    media: consulta,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = anterior;
  };
}

function instalarReloj(inicio: number) {
  let ahora = inicio;
  const now = performance.now.bind(performance);
  performance.now = () => ahora;
  const cola = new Map<number, FrameRequestCallback>();
  let serie = 1;
  const raf = globalThis.requestAnimationFrame;
  const cancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    const id = serie;
    serie += 1;
    cola.set(id, cb);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    cola.delete(id);
  }) as typeof cancelAnimationFrame;
  return {
    avanzar(ms: number) {
      ahora += ms;
    },
    disparar() {
      const lote = [...cola.values()];
      cola.clear();
      for (const cb of lote) cb(ahora);
    },
    restaurar() {
      performance.now = now;
      globalThis.requestAnimationFrame = raf;
      globalThis.cancelAnimationFrame = cancel;
    },
  };
}

async function pintar(root: Root, nota: number, veredicto: "cumplió" | "parcial" | "insuficiente"): Promise<void> {
  await act(async () => {
    root.render(createElement(PastillaVeredicto, { veredicto, nota }));
  });
}

function fila(id: string, titulo: string, nota: number) {
  return {
    id,
    titulo,
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner",
    miembroId: "voluntario-1",
    miembro: "Volunteer 1",
    estado: "en revisión",
    veredicto: "insuficiente",
    nota,
    frase: null,
    origen: "scout",
    codigo: null,
    montoRevisado: null,
    montoConfirmado: null,
    fecha: null,
    hashPago: null,
    credencialUrl: null,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 25; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}
