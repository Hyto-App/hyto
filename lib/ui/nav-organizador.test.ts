import assert from "node:assert/strict";
import test from "node:test";
import { idNavOrganizador, muestraNavOrganizador } from "./nav-organizador";

test("el organizador demo abre el evento demo aunque no haya membresía cargada", () => {
  assert.equal(muestraNavOrganizador([], true), true);
  assert.equal(idNavOrganizador("/mis-tareas", [], true), "demo");
  assert.equal(idNavOrganizador("/eventos/nuevo", [], true), "demo");
});

test("el evento abierto gana cuando la sesión lo organiza", () => {
  assert.equal(idNavOrganizador("/eventos/feria/tareas", ["demo", "feria"], false), "feria");
  assert.equal(idNavOrganizador("/eventos/otro", ["demo"], false), "demo");
  assert.equal(muestraNavOrganizador(["demo"], false), true);
  assert.equal(muestraNavOrganizador([], false), false);
  assert.equal(idNavOrganizador("/mis-tareas", [], false), null);
});
