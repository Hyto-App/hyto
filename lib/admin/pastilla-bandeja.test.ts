import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Bandeja } from "@/components/admin/Bandeja";
import { PastillaVeredicto } from "@/components/admin/PastillaVeredicto";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

test("la pastilla sin nota muestra la palabra y no un porcentaje", async () => {
  await montar(createElement(PastillaVeredicto, { veredicto: "cumplió", nota: null }));
  assert.equal(texto(), "Met");
  assert.equal(texto().includes("%"), false);
  assert.equal(document.querySelectorAll(".hyto-pill-ok").length, 1);
  await desmontar();
});

test("la palabra al lado de la pastilla usa el mismo color", async () => {
  await montar(createElement(PastillaVeredicto, { veredicto: "cumplió", nota: 84 }));
  const palabra = [...document.querySelectorAll("span")].find((nodo) => nodo.textContent === "Met");
  assert.match(palabra?.className ?? "", /hyto-pill-ok/);
  assert.equal(palabra?.className.includes("hyto-pill "), false);
  await desmontar();

  await montar(createElement(PastillaVeredicto, { veredicto: "insuficiente", nota: 40 }));
  const mala = [...document.querySelectorAll("span")].find((nodo) => nodo.textContent === "Insufficient");
  assert.match(mala?.className ?? "", /hyto-pill-bad/);
  await desmontar();
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

    await pulsar("Partial");
    assert.match(texto(), /Fifty/);
    assert.match(texto(), /Seventy nine/);
    assert.equal(texto().includes("Forty nine"), false);
    assert.equal(texto().includes("Eighty"), false);

    await pulsar("Met");
    assert.match(texto(), /Eighty/);
    assert.equal(texto().includes("Forty nine"), false);
    assert.equal(texto().includes("Fifty"), false);
    assert.equal(texto().includes("Seventy nine"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

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
