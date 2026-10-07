import assert from "node:assert/strict";
import test from "node:test";
import { usuarioDemo } from "./demo";
import { destinoInicio } from "./destino";

test("quien organiza entra a eventos", () => {
  const demo = usuarioDemo("organizador");
  assert.equal(destinoInicio({ email: demo.email, usuarioId: demo.id, rol: "organizador" }, true), "/eventos");
  assert.equal(destinoInicio({ email: "ana@hyto.test", usuarioId: "ana", rol: "voluntario" }, true), "/eventos");
});

test("el organizador demo entra a eventos aunque todavía no tenga membresía", () => {
  const demo = usuarioDemo("organizador");
  assert.equal(destinoInicio({ email: demo.email, usuarioId: demo.id, rol: "organizador" }, false), "/eventos");
});

test("el resto entra a sus tareas", () => {
  const demo = usuarioDemo("voluntario");
  assert.equal(destinoInicio({ email: demo.email, usuarioId: demo.id, rol: "voluntario" }, false), "/mis-tareas");
  assert.equal(destinoInicio({ email: "ana@hyto.test", usuarioId: "ana", rol: "voluntario" }, false), "/mis-tareas");
});
