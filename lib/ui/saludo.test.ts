import assert from "node:assert/strict";
import test from "node:test";
import { claveSaludo, franjaDe, primerNombre } from "./saludo";

test("la franja sigue la hora local: mañana, tarde y noche", () => {
  assert.equal(franjaDe(new Date(2026, 9, 7, 4, 59)), "noche");
  assert.equal(franjaDe(new Date(2026, 9, 7, 5, 0)), "manana");
  assert.equal(franjaDe(new Date(2026, 9, 7, 11, 59)), "manana");
  assert.equal(franjaDe(new Date(2026, 9, 7, 12, 0)), "tarde");
  assert.equal(franjaDe(new Date(2026, 9, 7, 18, 59)), "tarde");
  assert.equal(franjaDe(new Date(2026, 9, 7, 19, 0)), "noche");
});

test("el saludo usa el primer nombre y calla si no hay uno", () => {
  assert.equal(primerNombre("Ana María Solís"), "Ana");
  assert.equal(primerNombre("  Volunteer (demo) "), "Volunteer");
  assert.equal(primerNombre("ana@hyto.dev"), null);
  assert.equal(primerNombre("   "), null);
  assert.equal(primerNombre(null), null);
  assert.equal(claveSaludo("manana", true), "tareas.saludo.mananaNombre");
  assert.equal(claveSaludo("noche", false), "tareas.saludo.noche");
});
