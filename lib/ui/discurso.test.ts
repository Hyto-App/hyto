import assert from "node:assert/strict";
import test from "node:test";
import { LINEA_OG } from "@/components/ui/marca/trazos";
import {
  CLAVES_DISCURSO,
  DESCRIPCION_PAGINA,
  audienciasDiscurso,
  confianzaDiscurso,
  discurso,
  discursoDe,
  discursoEs,
  pasosDiscurso,
  preguntasDiscurso,
} from "./discurso";

const JERGA = /\b(trustline|escrow|soroban|xdr|testnet|mainnet|friendbot|wallet)\b/i;
const PROHIBIDO = /\bplata\b/i;
const FRASES = [
  "Proof before",
  "payout.",
  "Communities in Latin America funded from afar account for every spend.",
  "Practice network.",
  "no live payment is recorded yet",
  "Lock the funding",
  "Send a photo",
  "Release the payment",
  "Community members",
  "Organizers and funders",
  "A person releases every payment",
  "Mile only recommends",
  "The money is set aside first",
  "Why digital dollars, and not a local transfer?",
  "SINPE",
  "Try the demo",
  "Sign in",
  "How much does Hyto cost?",
  "Who approves a payment?",
  "What happens if the work is not approved?",
  "How do I convert digital dollars to colones?",
  "Does Hyto keep the funds?",
  "Josué confirma el tiempo",
];

test("el discurso de la landing está en un solo mapa en inglés", () => {
  assert.equal(CLAVES_DISCURSO.length, Object.keys(discurso).length);
  for (const clave of CLAVES_DISCURSO) {
    assert.equal(typeof discurso[clave], "string");
    assert.ok(discurso[clave].trim().length > 0, clave);
    assert.equal(JERGA.test(discurso[clave]), false, `${clave}: ${discurso[clave]}`);
    assert.equal(PROHIBIDO.test(discurso[clave]), false, `${clave}: ${discurso[clave]}`);
  }
  const unido = Object.values(discurso).join("\n");
  for (const frase of FRASES) assert.ok(unido.includes(frase), frase);
  assert.deepEqual(
    pasosDiscurso().map((paso) => paso.titulo),
    ["Lock the funding", "Send a photo", "Release the payment"],
  );
  assert.equal(audienciasDiscurso().length, 2);
  assert.equal(confianzaDiscurso().length, 3);
  assert.ok(preguntasDiscurso().length >= 5);
});

test("el discurso en español usa las mismas claves", () => {
  assert.deepEqual(Object.keys(discursoEs).sort(), [...CLAVES_DISCURSO].sort());
  for (const clave of CLAVES_DISCURSO) {
    assert.ok(discursoEs[clave].trim().length > 0, clave);
    assert.notEqual(discursoEs[clave], discurso[clave], clave);
    assert.equal(JERGA.test(discursoEs[clave]), false, `${clave}: ${discursoEs[clave]}`);
    assert.equal(PROHIBIDO.test(discursoEs[clave]), false, `${clave}: ${discursoEs[clave]}`);
  }
  assert.equal(discursoDe("en"), discurso);
  assert.equal(discursoDe("es"), discursoEs);
  const unido = Object.values(discursoEs).join("\n");
  for (const frase of [
    "Primero la prueba,",
    "Red de práctica.",
    "Aparte el financiamiento",
    "Conozca a Mile",
    "¿Necesito saber de criptomonedas?",
    "SINPE",
    "¿Cuánto cuesta Hyto?",
    "¿Quién aprueba un pago?",
    "¿Hyto guarda los fondos?",
    "Josué confirma el tiempo",
  ]) {
    assert.ok(unido.includes(frase), frase);
  }
});

test("la descripción de la página no nombra el activo", () => {
  assert.equal(DESCRIPCION_PAGINA.includes("USDC"), false);
  assert.match(DESCRIPCION_PAGINA, /digital dollars/);
  assert.equal(LINEA_OG.includes("USDC"), false);
  assert.match(discurso.subheadline, /\(USDC\)/);
});
