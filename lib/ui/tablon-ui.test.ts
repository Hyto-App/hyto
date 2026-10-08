import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { PaginaComunidad } from "@/components/comunidades/Pantallas";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

const original = globalThis.fetch;

test("el tablón muestra el aviso y el botón de tomar, sin un campo para escribir", async () => {
  limpiarPantalla();
  const llamadas: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    llamadas.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("/tablon")) {
      return Response.json({
        avisos: [
          {
            id: "a1",
            tipo: "disponible",
            titulo: "Montar",
            nombre: null,
            tareaId: "t1",
            creadoEn: "2026-10-08T00:00:00.000Z",
            libre: true,
          },
        ],
      });
    }
    if (url.includes("/api/proyectos")) return Response.json({ proyectos: [] });
    return Response.json({
      comunidad: { id: "c1", nombre: "Norte", descripcion: "Calle", fotoUrl: null, visibilidad: "publica" },
      membresia: { rol: "miembro" },
      miembros: [{ usuarioId: "leo", nombre: "Leo", rol: "miembro" }],
      solicitudes: [],
      eventos: [],
    });
  }) as typeof fetch;
  try {
    await montar(createElement(PaginaComunidad, { id: "c1", mostrarTablon: true }), { push: () => undefined });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Bulletin/);
    assert.match(texto(), /Automatic notices/);
    assert.match(texto(), /New task available: Montar/);
    assert.match(texto(), /Take task/);
    assert.equal(document.querySelector("textarea"), null);
    assert.ok(llamadas.some((llamada) => llamada.includes("/tablon")));
    await desmontar();
    llamadas.length = 0;
    await montar(createElement(PaginaComunidad, { id: "c1" }), { push: () => undefined });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.doesNotMatch(texto(), /Bulletin/);
    assert.equal(llamadas.some((llamada) => llamada.includes("/tablon")), false);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
