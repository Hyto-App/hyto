import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Revision } from "@/components/admin/Revision";
import { botonesRevision } from "@/lib/admin/remoto";
import type { TareaAdmin } from "@/lib/admin/tipos";
import type { EtiquetaNota } from "@/lib/revision/razones";
import { desmontar, montar, texto } from "../../tests/integracion/montar";

const GRAVE: EtiquetaNota = {
  id: "cap_no_coincide",
  texto: "Falta grave: no coincide con lo pedido",
  explicacion: "The photo does not match what was requested, so the grade stays Insuficiente.",
  severidad: "problem",
  preguntas: ["v1"],
};

test("las etiquetas no cambian los botones de pago", () => {
  const base = tarea();
  const conEtiquetas = tarea({ etiquetas: [GRAVE], nota: 49, veredicto: "insuficiente" });
  const escrow = { contrato: "CABC", fondeado: true as const };
  assert.deepEqual(botonesRevision(base, true, escrow), botonesRevision(conEtiquetas, true, escrow));
  assert.equal(botonesRevision(conEtiquetas, true, escrow).pagar, true);
  assert.equal(botonesRevision(conEtiquetas, true, { contrato: null, fondeado: null }).desplegar, true);
});

test("un pago enviado que el indexador no muestra no ofrece fondear, pagar ni desplegar", () => {
  const pendiente = tarea({ hashPago: "11".repeat(32) });
  for (const fondeado of [true, false, null]) {
    const botones = botonesRevision(pendiente, true, { contrato: "CABC", fondeado });
    assert.equal(botones.desplegar, false);
    assert.equal(botones.fondear, false);
    assert.equal(botones.pagar, false);
  }
});

test("la revisión muestra la etiqueta y sigue ofreciendo Lock budget", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/tareas") return json({ tareas: [{ id: "stand", hashPago: null, contratoEscrow: null }] });
    return json({
      tarea: tarea({ etiquetas: [GRAVE], nota: 49, veredicto: "insuficiente" }),
      foto: null,
      contratoEscrow: null,
      wallet: "GORGANIZADOR",
    });
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "stand" }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /49% · Insuficiente/);
    assert.match(texto(), /Falta grave: no coincide con lo pedido/);
    assert.match(texto(), /The photo does not match what was requested/);
    assert.equal([...document.querySelectorAll("button")].some((boton) => boton.textContent === "Lock budget"), true);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

function tarea(parcial: Partial<TareaAdmin> = {}): TareaAdmin {
  return {
    id: "stand",
    titulo: "Set up the booth",
    tipo: "trabajo",
    monto: "20",
    tope: null,
    condicion: "Banner visible and the table set up",
    miembroId: "voluntario-1",
    miembro: "Volunteer 1",
    estado: "en revisión",
    veredicto: "cumplió",
    nota: 100,
    frase: "Table set up.",
    origen: "scout",
    codigo: null,
    montoRevisado: null,
    montoConfirmado: null,
    fecha: null,
    hashPago: null,
    credencialUrl: null,
    ...parcial,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
