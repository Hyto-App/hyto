import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAVES_DISCURSO,
  audienciasDiscurso,
  confianzaDiscurso,
  discurso,
  discursoDe,
  discursoEs,
  pasosDiscurso,
} from "./discurso";

const JERGA = /\b(trustline|escrow|soroban|xdr|testnet|mainnet|friendbot|wallet)\b/i;
const FRASES = [
  "Prove your worth,",
  "get paid.",
  "A marketplace of small tasks. You get paid in dollars in crypto (USDC).",
  "Practice network.",
  "This app runs on a practice network for now",
  "Pick a task",
  "Send a photo",
  "Get paid",
  "Volunteers and workers",
  "Organizers",
  "The organizer approves every payment",
  "The AI only suggests",
  "The money is set aside before the work",
  "Try the demo",
  "Sign in",
];

test("el discurso de la landing está en un solo mapa en inglés", () => {
  assert.equal(CLAVES_DISCURSO.length, Object.keys(discurso).length);
  for (const clave of CLAVES_DISCURSO) {
    assert.equal(typeof discurso[clave], "string");
    assert.ok(discurso[clave].trim().length > 0, clave);
    assert.equal(JERGA.test(discurso[clave]), false, `${clave}: ${discurso[clave]}`);
  }
  const unido = Object.values(discurso).join("\n");
  for (const frase of FRASES) assert.ok(unido.includes(frase), frase);
  assert.deepEqual(
    pasosDiscurso().map((paso) => paso.titulo),
    ["Pick a task", "Send a photo", "Get paid"],
  );
  assert.equal(audienciasDiscurso().length, 2);
  assert.equal(confianzaDiscurso().length, 3);
});

test("el discurso en español usa las mismas claves", () => {
  assert.deepEqual(Object.keys(discursoEs).sort(), [...CLAVES_DISCURSO].sort());
  for (const clave of CLAVES_DISCURSO) {
    assert.ok(discursoEs[clave].trim().length > 0, clave);
    assert.notEqual(discursoEs[clave], discurso[clave], clave);
    assert.equal(JERGA.test(discursoEs[clave]), false, `${clave}: ${discursoEs[clave]}`);
  }
  assert.equal(discursoDe("en"), discurso);
  assert.equal(discursoDe("es"), discursoEs);
  const unido = Object.values(discursoEs).join("\n");
  for (const frase of ["Demuestra tu valor,", "Red de práctica.", "Elige una tarea", "Conoce a Mile", "¿Necesito saber de cripto?"]) {
    assert.ok(unido.includes(frase), frase);
  }
});
