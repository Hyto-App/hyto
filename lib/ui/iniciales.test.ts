import assert from "node:assert/strict";
import test from "node:test";
import { iniciales } from "@/components/ui/Marca";

test("las iniciales ignoran el paréntesis y los símbolos", () => {
  assert.equal(iniciales("Volunteer (demo)"), "V");
  assert.equal(iniciales("Voluntario (demo)"), "V");
  assert.equal(iniciales("Organizer (demo)"), "O");
  assert.equal(iniciales("Organizador (demo)"), "O");
  assert.equal(iniciales("Ana Solís"), "AS");
  assert.equal(iniciales("Ana (lead) Solís"), "AS");
});

test("sin letras, la inicial es la primera del correo", () => {
  assert.equal(iniciales("", "ana@hyto.dev"), "A");
  assert.equal(iniciales("(demo)", "voluntario@hyto.demo"), "V");
  assert.equal(iniciales("???", null), "•");
});
