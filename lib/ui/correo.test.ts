import assert from "node:assert/strict";
import test from "node:test";
import { enmascararCorreo } from "./correo";

test("enmascararCorreo deja la inicial y el dominio", () => {
  assert.equal(enmascararCorreo("ana.prueba@gmail.com"), "a•••@gmail.com");
  assert.equal(enmascararCorreo("  Luis@Hyto.app "), "L•••@Hyto.app");
  assert.equal(enmascararCorreo("x@y.co"), "x•••@y.co");
});

test("enmascararCorreo no falla con lo que no es un correo", () => {
  assert.equal(enmascararCorreo(""), "");
  assert.equal(enmascararCorreo("sin-arroba"), "•••");
  assert.equal(enmascararCorreo("@dominio.com"), "•••@dominio.com");
  // The local part is cut by characters, not by UTF-16 units.
  assert.equal(enmascararCorreo("😀persona@hyto.app"), "😀•••@hyto.app");
});
