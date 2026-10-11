import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Bandeja } from "@/components/admin/Bandeja";
import { desmontar, montar, pulsar, texto } from "../../tests/integracion/montar";

test("la bandeja deja ver una tarea pagada y abrir su revisión", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/vista")) {
      return json({
        nombre: "Feria",
        tareas: [
          {
            id: "comida",
            titulo: "Team meal",
            tipo: "reembolso",
            monto: "15",
            tope: "15",
            condicion: "Receipt",
            miembroId: "v",
            miembro: "Ana",
            estado: "pagado",
            veredicto: "cumplió",
            nota: 90,
            frase: "Receipt",
            origen: "guion",
            montoRevisado: "12.48",
            montoConfirmado: "12.48",
            hashPago: "ab".repeat(32),
          },
        ],
      });
    }
    if (url.includes("/novedades")) return json({ cursor: "a".repeat(32), cambios: [] });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Bandeja, { proyectoId: "evt" }));
    await esperar(() => texto().includes("Team meal"));
    // Status chips carry their counts; the paid row shows the net, the gross and fee are a detail.
    assert.match(texto(), /Paid 1/);
    assert.match(texto(), /To review 0/);
    assert.match(texto(), /US\$12\.44/);
    assert.match(texto(), /US\$12\.48 minus a US\$0\.04 fee/);
    assert.equal(texto().includes("Up to US$15"), false);
    const enlaces = [...document.querySelectorAll('a[href="/revision/comida"]')];
    assert.equal(enlaces.some((nodo) => nodo.textContent?.includes("Open review")), true);
    assert.equal(enlaces.some((nodo) => nodo.textContent?.includes("Team meal")), true);
    await pulsar("To review");
    assert.equal(document.querySelector('a.pj-item[href="/revision/comida"]'), null);
    await pulsar("Paid");
    assert.equal(document.querySelector('a.pj-item[href="/revision/comida"]')?.textContent?.includes("Team meal"), true);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("cada tarea en revisión enlaza a su propia revisión", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/vista")) {
      return json({
        nombre: "Feria",
        tareas: [
          {
            id: "stand",
            titulo: "Booth",
            tipo: "trabajo",
            monto: "20",
            tope: null,
            condicion: "Banner",
            miembroId: "v",
            miembro: "Ana",
            estado: "en revisión",
            veredicto: "parcial",
            nota: 64,
            frase: "Banner",
            origen: "guion",
            montoRevisado: null,
            hashPago: null,
          },
          {
            id: "registro",
            titulo: "Check-in",
            tipo: "trabajo",
            monto: "20",
            tope: null,
            condicion: "List",
            miembroId: "v",
            miembro: "Ana",
            estado: "en revisión",
            veredicto: "cumplió",
            nota: 90,
            frase: "List",
            origen: "guion",
            montoRevisado: null,
            hashPago: null,
          },
        ],
      });
    }
    if (url.includes("/novedades")) return json({ cursor: "a".repeat(32), cambios: [] });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Bandeja, { proyectoId: "evt" }));
    await esperar(() => texto().includes("Booth") && texto().includes("Check-in"));
    assert.ok(document.querySelector('a[href="/revision/stand"]'));
    assert.ok(document.querySelector('a[href="/revision/registro"]'));
    const enlaces = [...document.querySelectorAll('a[href^="/revision/"]')].map((nodo) => nodo.getAttribute("href"));
    assert.equal(enlaces.includes("/revision/stand"), true);
    assert.equal(enlaces.includes("/revision/registro"), true);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("una tarea pendiente sin foto aparece como Aún sin evidencia y abre su revisión", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/vista")) {
      return json({
        nombre: "Feria",
        tareas: [
          {
            id: "stand",
            titulo: "Booth",
            tipo: "trabajo",
            monto: "20",
            tope: null,
            condicion: "",
            miembroId: "",
            miembro: "Unassigned",
            estado: "pendiente",
            veredicto: null,
            nota: null,
            frase: null,
            origen: null,
            montoRevisado: null,
            montoConfirmado: null,
            hashPago: null,
          },
          {
            id: "comida",
            titulo: "Meal",
            tipo: "reembolso",
            monto: "15",
            tope: "15",
            condicion: "",
            miembroId: "v",
            miembro: "Ana",
            estado: "pendiente",
            veredicto: null,
            nota: null,
            frase: null,
            origen: null,
            montoRevisado: "12",
            tipoArchivo: "image/jpeg",
            hashPago: null,
          },
        ],
      });
    }
    if (url.includes("/novedades")) return json({ cursor: "a".repeat(32), cambios: [] });
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Bandeja, { proyectoId: "evt" }));
    await esperar(() => texto().includes("No evidence yet"));
    assert.match(texto(), /Pending 2/);
    // Locking lives in Tasks now: the inbox rows only open the review.
    assert.equal([...document.querySelectorAll("a")].some((nodo) => nodo.textContent === "Lock budget"), false);
    const stand = document.querySelector('a.pj-item[href="/revision/stand"]');
    assert.match(stand?.textContent ?? "", /Unassigned/);
    const comida = document.querySelector('a.pj-item[href="/revision/comida"]');
    assert.match(comida?.textContent ?? "", /Ana/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function esperar(listo: () => boolean): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    if (listo()) return;
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}
