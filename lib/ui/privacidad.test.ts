import assert from "node:assert/strict";
import test from "node:test";
import { ENLACE_PRIVACIDAD, PRIVACIDAD } from "./privacidad";

const JERGA = /\b(escrow|testnet)\b/i;

test("la privacidad está en inglés y no nombra la red ni el contrato", () => {
  const textos = [
    ENLACE_PRIVACIDAD,
    PRIVACIDAD.titulo,
    PRIVACIDAD.kicker,
    PRIVACIDAD.titular,
    PRIVACIDAD.entrada,
    PRIVACIDAD.inicio,
    ...PRIVACIDAD.secciones.flatMap((seccion) => [seccion.titulo, seccion.cuerpo]),
  ];
  const unido = textos.join("\n");
  assert.equal(JERGA.test(unido), false, unido);
  assert.match(unido, /Privacy/);
  assert.match(unido, /digital dollars \(USDC\)/);
  assert.ok(PRIVACIDAD.secciones.length >= 3);
  for (const texto of textos) assert.ok(texto.trim().length > 0);
});
