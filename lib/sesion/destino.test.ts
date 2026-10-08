import assert from "node:assert/strict";
import test from "node:test";
import { nombreDemoVisible, usuarioDemo } from "./demo";
import { destinoInicio, rutaDeTarea } from "./destino";

test("quien organiza entra a eventos", () => {
  const demo = usuarioDemo("organizador");
  assert.equal(destinoInicio({ email: demo.email, usuarioId: demo.id, rol: "organizador" }, true), "/eventos");
  assert.equal(destinoInicio({ email: "ana@hyto.test", usuarioId: "ana", rol: "voluntario" }, true), "/eventos");
});

test("el organizador demo entra a eventos aunque todavía no tenga membresía", () => {
  const demo = usuarioDemo("organizador");
  assert.equal(destinoInicio({ email: demo.email, usuarioId: demo.id, rol: "organizador" }, false), "/eventos");
});

test("el nombre demo sigue el idioma de la sesión", () => {
  assert.equal(nombreDemoVisible("Organizer (demo)", "es"), "Organizador (demo)");
  assert.equal(nombreDemoVisible("Volunteer (demo)", "es"), "Voluntario (demo)");
  assert.equal(nombreDemoVisible("Voluntario (demo)", "en"), "Volunteer (demo)");
  assert.equal(nombreDemoVisible("Ana", "es"), "Ana");
  assert.equal(nombreDemoVisible(null, "es"), null);
});

test("quien no es el asignado abre la revisión, no un aviso de tarea inexistente", () => {
  assert.equal(rutaDeTarea("demo-stand", "demo-voluntario", "demo-voluntario"), "/tareas/demo-stand");
  assert.equal(rutaDeTarea("demo-stand", "demo-voluntario", "demo-organizador"), "/revision/demo-stand");
});

test("el resto entra a sus tareas", () => {
  const demo = usuarioDemo("voluntario");
  assert.equal(destinoInicio({ email: demo.email, usuarioId: demo.id, rol: "voluntario" }, false), "/mis-tareas");
  assert.equal(destinoInicio({ email: "ana@hyto.test", usuarioId: "ana", rol: "voluntario" }, false), "/mis-tareas");
});
