import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { SubirEvidencia } from "../../components/integrante/SubirEvidencia";
import { ProveedorModoDemo } from "../../components/sesion/InsigniaDemo";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("un trabajo solo ofrece la cámara y un reembolso solo el archivo", async () => {
  const original = globalThis.fetch;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/tareas")) {
      return json({
        tareas: [
          {
            id: "stand",
            titulo: "Set up the booth",
            tipo: "trabajo",
            monto: "20",
            condicion: "Show the work",
            miembroId: "voluntario-1",
            estado: "pendiente",
            proyectoId: "zeek",
          },
          {
            id: "comida",
            titulo: "Team meal",
            tipo: "reembolso",
            monto: "15",
            condicion: "Receipt",
            miembroId: "voluntario-1",
            estado: "pendiente",
            proyectoId: "zeek",
          },
        ],
      });
    }
    if (url.includes("/api/proyectos")) return json({ proyectos: [{ id: "zeek", nombre: "ZEEK" }] });
    return json({}, 404);
  };
  globalThis.fetch = fetchImpl;
  try {
    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "stand" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Open camera/);
    assert.doesNotMatch(texto(), /Choose a photo/);
    assert.doesNotMatch(texto(), /Choose a PDF/);
    await desmontar();
    limpiarPantalla();

    await montar(createElement(ProveedorModoDemo, { activo: false, children: createElement(SubirEvidencia, { tareaId: "comida" }) }));
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Choose a file/);
    assert.match(texto(), /Choose a PDF or image/);
    assert.doesNotMatch(texto(), /Open camera/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
