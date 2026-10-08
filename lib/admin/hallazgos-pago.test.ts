import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createElement } from "react";
import { act } from "react";
import { Revision } from "@/components/admin/Revision";
import { PantallaPagada } from "@/components/integrante/evidencia/PantallaPagada";
import type { Tarea } from "@/lib/integrante/tipos";
import { desmontar, montar, texto } from "../../tests/integracion/montar";

before(() => {
  (globalThis as { __HYTO_SONDEO_MS?: number }).__HYTO_SONDEO_MS = 20;
});

after(() => {
  delete (globalThis as { __HYTO_SONDEO_MS?: number }).__HYTO_SONDEO_MS;
});

test("quien cobra ve lo liberado, no el tope de la tarea", async () => {
  const tarea: Tarea = {
    id: "comida",
    proyectoId: "evt",
    titulo: "Team meal",
    tipo: "reembolso",
    monto: "15",
    tope: "15",
    condicion: "Receipt",
    miembroId: "v",
    walletCobro: "",
    estado: "pagado",
    prioridad: "normal",
    dificultad: null,
    montoConfirmado: "12.48",
    hashPago: "ab".repeat(32),
  };
  try {
    await montar(createElement(PantallaPagada, { tarea, titulo: "Team meal" }));
    await esperar(() => texto().includes("You received"));
    assert.match(texto(), /\+12\.44256 USDC/);
    assert.match(texto(), /You received/);
    assert.match(texto(), /12\.44256 USDC/);
    assert.equal(texto().includes("15 USDC"), false);
  } finally {
    await desmontar();
  }
});

test("después de fondear, el texto dice el monto bloqueado y no el tope", async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/eventos/evt/novedades")) return json({ cursor: "a".repeat(32), cambios: [] });
    if (url.startsWith("/api/escrow/")) return json({ escrow: { balance: "12.48" } });
    if (url === "/api/tareas") return json({ tareas: [{ id: "comida", proyectoId: "evt", hashPago: null, contratoEscrow: "CCOMIDA" }] });
    if (url.startsWith("/api/revision/comida")) {
      return json({
        tarea: {
          id: "comida",
          titulo: "Team meal",
          tipo: "reembolso",
          monto: "15",
          tope: "15",
          condicion: "Receipt",
          miembroId: "v",
          miembro: "Ana",
          estado: "en revisión",
          veredicto: "cumplió",
          nota: 90,
          frase: "Receipt",
          origen: "guion",
          codigo: null,
          montoRevisado: "12.48",
          montoConfirmado: "12.48",
          fecha: "2026-10-07",
          hashPago: null,
          credencialUrl: null,
        },
        foto: null,
        contratoEscrow: "CCOMIDA",
        wallet: null,
      });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "comida", eventoId: "evt" }));
    await esperar(() => texto().includes("The payment sends US$12.48"));
    assert.equal(texto().includes("The payment sends Up to"), false);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
  }
});

test("un 401 de novedades pide volver a entrar en vez de dejar la revisión quieta", async () => {
  window.history.pushState(null, "", "/revision/comida");
  const anterior = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/eventos/evt/novedades")) return json({ aviso: "Sign in to continue." }, 401);
    if (url === "/api/tareas") return json({ tareas: [{ id: "comida", proyectoId: "evt", hashPago: null, contratoEscrow: null }] });
    if (url.startsWith("/api/revision/comida")) {
      return json({
        tarea: {
          id: "comida",
          titulo: "Team meal",
          tipo: "reembolso",
          monto: "15",
          tope: "15",
          condicion: "Receipt",
          miembroId: "v",
          miembro: "Ana",
          estado: "en revisión",
          veredicto: null,
          nota: null,
          frase: null,
          origen: null,
          codigo: null,
          montoRevisado: null,
          montoConfirmado: null,
          fecha: null,
          hashPago: null,
          credencialUrl: null,
        },
        foto: null,
        contratoEscrow: null,
        wallet: null,
      });
    }
    return json({ aviso: "no" }, 404);
  }) as typeof fetch;
  try {
    await montar(createElement(Revision, { tareaId: "comida", eventoId: "evt" }));
    await esperar(() => (document.querySelector("[role='alert'] a")?.getAttribute("href") ?? "").includes("next="));
    assert.match(texto(), /Your sign-in expired/);
    const enlace = document.querySelector("[role='alert'] a");
    assert.equal(enlace?.textContent, "Sign in again");
    assert.match(enlace?.getAttribute("href") ?? "", /signin=1/);
    assert.match(enlace?.getAttribute("href") ?? "", /next=%2Frevision%2Fcomida/);
  } finally {
    globalThis.fetch = anterior;
    window.history.pushState(null, "", "/");
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
      await new Promise((resolver) => setTimeout(resolver, 25));
    });
  }
  throw new Error(`Timed out. Screen: ${texto()}`);
}
