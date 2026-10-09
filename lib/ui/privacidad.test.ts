import assert from "node:assert/strict";
import test from "node:test";
import { ENLACE_PRIVACIDAD, PRIVACIDAD, privacidadDe } from "./privacidad";

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
  assert.match(
    unido,
    /the address of the account where your earnings arrive on Stellar, a payments network/,
  );
  assert.match(unido, /Sign-in is with our partner Cavos\. Payments use Stellar, a payments network\./);
  assert.doesNotMatch(unido, /account address/);
  assert.doesNotMatch(unido, /Payment accounts live on Stellar/);
  assert.doesNotMatch(unido, /Sign-in is handled by Cavos/);
  assert.ok(PRIVACIDAD.secciones.length >= 3);
  for (const texto of textos) assert.ok(texto.trim().length > 0);

  const es = privacidadDe("es");
  const textosEs = [es.titulo, es.kicker, es.titular, es.entrada, es.inicio, ...es.secciones.flatMap((seccion) => [seccion.titulo, seccion.cuerpo])];
  const unidoEs = textosEs.join("\n");
  assert.equal(JERGA.test(unidoEs), false, unidoEs);
  assert.match(unidoEs, /Privacidad/);
  assert.match(unidoEs, /dólares digitales \(USDC\)/);
  assert.match(
    unidoEs,
    /la dirección de la cuenta donde le llega lo que gana, en Stellar, una red de pagos/,
  );
  assert.match(
    unidoEs,
    /El ingreso es con nuestro socio Cavos; los pagos usan Stellar, una red de pagos\./,
  );
  assert.doesNotMatch(unidoEs, /Las cuentas de pago viven en Stellar/);
  assert.doesNotMatch(unidoEs, /El ingreso lo maneja Cavos/);
});
