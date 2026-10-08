import "../../tests/integracion/dom-global";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { act } from "react";
import { FormularioComunidad, ListaComunidades, PaginaComunidad, UnirseCodigo } from "@/components/comunidades/Pantallas";
import { desmontar, limpiarPantalla, montar, texto } from "../../tests/integracion/montar";

const original = globalThis.fetch;

test("el listado busca comunidades públicas y el alta pide visibilidad", async () => {
  limpiarPantalla();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/comunidades")) {
      return Response.json({
        publicas: [{ id: "c1", nombre: "Norte", descripcion: "Empresa", fotoUrl: null, visibilidad: "publica" }],
        mias: [],
      });
    }
    return Response.json({}, { status: 404 });
  }) as typeof fetch;
  try {
    await montar(createElement(ListaComunidades), { push: () => undefined });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 280));
    });
    assert.match(texto(), /Search public communities/);
    assert.match(texto(), /Norte/);
    assert.match(texto(), /Create a community/);
    await desmontar();
    await montar(createElement(FormularioComunidad), { push: () => undefined });
    assert.ok(document.querySelector("#nombre-comunidad"));
    assert.ok(document.querySelector("#descripcion-comunidad"));
    assert.ok(document.querySelector("#foto-comunidad"));
    assert.match(texto(), /Anyone signed in can join/);
    assert.match(texto(), /People join with the code/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});

test("una comunidad privada ofrece solicitar y una pública muestra a los miembros", async () => {
  limpiarPantalla();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/proyectos")) return Response.json({ proyectos: [] });
    if (url.endsWith("/privada")) {
      return Response.json({
        comunidad: { id: "privada", nombre: "Sur", descripcion: "", fotoUrl: null, visibilidad: "privada" },
        membresia: null,
        miembros: [],
        solicitudes: [],
        eventos: [],
      });
    }
    return Response.json({
      comunidad: { id: "publica", nombre: "Norte", descripcion: "Calle", fotoUrl: null, visibilidad: "publica", codigo: "ABC" },
      membresia: { rol: "admin" },
      miembros: [{ usuarioId: "ana", nombre: "Ana", rol: "admin" }],
      solicitudes: [{ id: "s1", usuarioId: "leo", nombre: "Leo" }],
      eventos: [],
    });
  }) as typeof fetch;
  try {
    await montar(createElement(PaginaComunidad, { id: "privada" }), { push: () => undefined });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Request to join/);
    assert.doesNotMatch(texto(), /Leo/);
    await desmontar();
    await montar(createElement(PaginaComunidad, { id: "publica" }), { push: () => undefined });
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30));
    });
    assert.match(texto(), /Ana/);
    assert.match(texto(), /Approve/);
    assert.match(texto(), /ABC/);
    await desmontar();
    await montar(createElement(UnirseCodigo), { push: () => undefined });
    assert.ok(document.querySelector("#codigo-comunidad"));
    assert.match(texto(), /Join with a code/);
  } finally {
    globalThis.fetch = original;
    await desmontar();
    limpiarPantalla();
  }
});
