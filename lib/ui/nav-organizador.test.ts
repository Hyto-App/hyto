import assert from "node:assert/strict";
import test from "node:test";
import { ENLACES_BARRA, enlacesBarra, muestraNavOrganizador } from "./nav-organizador";

test("organiza quien ya organiza un evento o el organizador demo", () => {
  assert.equal(muestraNavOrganizador([], true), true);
  assert.equal(muestraNavOrganizador(["demo"], false), true);
  assert.equal(muestraNavOrganizador([], false), false);
});

test("la barra tiene exactamente dos entradas principales: Eventos y Mis tareas", () => {
  assert.deepEqual(
    ENLACES_BARRA.map((enlace) => enlace.href),
    ["/eventos", "/mis-tareas"],
  );
  assert.deepEqual(
    ENLACES_BARRA.map((enlace) => enlace.clave),
    ["nav.events", "nav.myTasks"],
  );
  assert.equal(enlacesBarra(false), ENLACES_BARRA);
});

test("la barra no enlaza la bandeja, el informe, las tareas del evento ni el código", () => {
  for (const comunidades of [false, true]) {
    for (const enlace of enlacesBarra(comunidades)) {
      assert.doesNotMatch(enlace.href, /^\/eventos\/[^/]+/);
      assert.doesNotMatch(enlace.href, /\/informe|\/eventos\/[^/]+\/tareas|^\/join/);
    }
  }
});

test("cada entrada lleva a un lugar distinto con un ícono distinto", () => {
  for (const comunidades of [false, true]) {
    const enlaces = enlacesBarra(comunidades);
    assert.equal(new Set(enlaces.map((enlace) => enlace.href)).size, enlaces.length);
    assert.equal(new Set(enlaces.map((enlace) => enlace.icono)).size, enlaces.length);
  }
  assert.deepEqual(
    enlacesBarra(true).map((enlace) => enlace.href),
    ["/eventos", "/mis-tareas", "/comunidades"],
  );
});
