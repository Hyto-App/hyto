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
    await esperar(() => texto().includes("Team meal") && texto().includes("Nothing to approve"));
    assert.match(texto(), /Paid tasks/);
    assert.match(texto(), /Paid · US\$12\.44 \(US\$12\.48 minus a US\$0\.04 fee\) · Limit US\$15/);
    assert.equal(texto().includes("Up to US$15"), false);
    const enlace = document.querySelector('a[href="/revision/comida"]');
    assert.equal(enlace?.textContent?.includes("Open review"), true);
    await pulsar("Paid tasks");
    assert.equal(texto().includes("Nothing to approve"), false);
    assert.equal(document.querySelector('a[href="/revision/comida"]')?.textContent?.includes("Team meal"), true);
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
