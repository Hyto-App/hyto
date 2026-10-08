import assert from "node:assert/strict";
import test from "node:test";
import { ENLACE_PRIVACIDAD, enlacePrivacidad, PRIVACIDAD, privacidadDe } from "./privacidad";

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

  const es = privacidadDe("es");
  const textosEs = [es.titulo, es.kicker, es.titular, es.entrada, es.inicio, ...es.secciones.flatMap((seccion) => [seccion.titulo, seccion.cuerpo])];
  const unidoEs = textosEs.join("\n");
  assert.equal(JERGA.test(unidoEs), false, unidoEs);
  assert.equal(enlacePrivacidad("es"), "Privacidad");
  assert.equal(enlacePrivacidad("en"), "Privacy");
  assert.match(unidoEs, /Privacidad/);
  assert.match(unidoEs, /dólares digitales \(USDC\)/);
});
