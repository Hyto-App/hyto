import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";
import { INTERVALO_SEGUIMIENTO_MS } from "./seguimiento";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const base = {
  id: "stand",
  titulo: "Set up the booth",
  tipo: "trabajo",
  monto: "20",
  condicion: "Banner visible; table set up",
  miembroId: "voluntario-1",
  estado: "en revisión",
  proyectoId: "zeek",
};

test("Revisando muestra a Mile buscando y pasa a Enviada cuando llega la nota", async () => {
  limpiarPantalla();
  const anterior = globalThis.fetch;
  let lecturas = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      lecturas += 1;
      return json({ tareas: [lecturas > 1 ? { ...base, nota: 84, veredicto: "cumplió" } : { ...base, nota: null }] });
    }
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Mile is checking your photo/);
    // Static fallback while the animated rig loads, or the rig itself once it is ready (#159).
    const rigListo = [...document.querySelectorAll<HTMLElement>(".hyto-mile-animada [data-mile-rig]")].some((nodo) => nodo.style.display === "block");
    assert.ok(document.querySelector('img[src="/mile/mile-buscando-dark.svg"]') || rigListo);
    assert.equal(document.querySelectorAll(".hyto-checklist li").length, 2);
    assert.equal(document.querySelectorAll(".hyto-checklist .hyto-punto-espera").length, 2);
    const cta = [...document.querySelectorAll("button")].find((item) => item.textContent === "Sent");
    assert.equal((cta as HTMLButtonElement | undefined)?.disabled, true);

    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, INTERVALO_SEGUIMIENTO_MS + 300));
    });
    assert.ok(lecturas >= 2);
    assert.doesNotMatch(texto(), /Mile is checking your photo/);
    assert.match(texto(), /Your photo arrived/);
    assert.match(texto(), /What happens now/);
    assert.match(texto(), /84% · Completed/);
  } finally {
    globalThis.fetch = anterior;
    await desmontar();
    limpiarPantalla();
  }
});
