import assert from "node:assert/strict";
import test from "node:test";
import { texto } from "./diccionario";
import { claveSaludo, franjaDe, primerNombre } from "./saludo";

test("la franja sigue la hora local: mañana, tarde, noche y madrugada", () => {
  assert.equal(franjaDe(new Date(2026, 9, 8, 0, 0)), "madrugada");
  assert.equal(franjaDe(new Date(2026, 9, 8, 2, 29)), "madrugada");
  assert.equal(franjaDe(new Date(2026, 9, 7, 4, 59)), "madrugada");
  assert.equal(franjaDe(new Date(2026, 9, 7, 5, 0)), "manana");
  assert.equal(franjaDe(new Date(2026, 9, 7, 11, 59)), "manana");
  assert.equal(franjaDe(new Date(2026, 9, 7, 12, 0)), "tarde");
  assert.equal(franjaDe(new Date(2026, 9, 7, 18, 59)), "tarde");
  assert.equal(franjaDe(new Date(2026, 9, 7, 19, 0)), "noche");
  assert.equal(franjaDe(new Date(2026, 9, 7, 23, 59)), "noche");
  assert.equal(texto("en", "tareas.saludo.madrugada"), "Good night");
  assert.equal(texto("en", "tareas.saludo.noche"), "Good evening");
  assert.equal(texto("es", "tareas.saludo.madrugada"), "Buenas noches");
  assert.notEqual(texto("en", claveSaludo("madrugada", false)), texto("en", claveSaludo("noche", false)));
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
