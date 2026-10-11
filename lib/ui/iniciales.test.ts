import assert from "node:assert/strict";
import test from "node:test";
import { iniciales } from "@/components/ui/Marca";
import { iniciales as inicialesServidor } from "@/lib/perfil/iniciales";

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

test("la versión del servidor da las mismas iniciales", () => {
  for (const nombre of ["Organizador (demo)", "Organizer (demo)", "Ana (lead) Solís", "Ana Solís.", "¡Mile!"]) {
    assert.equal(inicialesServidor(nombre), iniciales(nombre), nombre);
  }
  assert.equal(inicialesServidor("Organizador (demo)"), "O");
});
