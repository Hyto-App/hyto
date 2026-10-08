import assert from "node:assert/strict";
import test from "node:test";
import { ATAJOS, PREGUNTAS, buscarPreguntas, normalizarBusqueda, type PreguntaVisible } from "./ayuda";
import { es, leerTexto } from "./diccionario";

const JERGA = /escrow|testnet|trustline|xdr|soroban|friendbot|mainnet/i;

test("la ayuda tiene atajos fijos y las respuestas de quien organiza", () => {
  assert.deepEqual(
    ATAJOS.map((atajo) => atajo.id),
    ["tareas", "evidencia", "pago", "faq"],
  );
  assert.ok(PREGUNTAS.length >= 8 && PREGUNTAS.length <= 20);
  for (const id of ["pago", "fondear", "costos", "sinPagar", "orgReembolso"] as const) {
    assert.equal(PREGUNTAS.includes(id), true);
  }
  assert.equal(ATAJOS.find((atajo) => atajo.id === "tareas" && "href" in atajo && atajo.href === "/mis-tareas") !== undefined, true);
  assert.equal(ATAJOS.find((atajo) => atajo.id === "pago" && "faq" in atajo && atajo.faq === "pago") !== undefined, true);
});

test("la búsqueda ignora tildes y no inventa respuestas", () => {
  const preguntas: PreguntaVisible[] = [
    { id: "pago", pregunta: "¿Cómo me pagan?", respuesta: "Quien organiza envía el pago." },
    { id: "evidencia", pregunta: "¿Qué foto envío?", respuesta: "Solo una foto del trabajo." },
  ];
  assert.equal(normalizarBusqueda("  Págame "), "pagame");
  assert.deepEqual(
    buscarPreguntas(preguntas, "pagan").map((item) => item.id),
    ["pago"],
  );
  assert.deepEqual(buscarPreguntas(preguntas, "video"), []);
  assert.equal(buscarPreguntas(preguntas, "   ").length, 2);
});

test("las respuestas escritas no prometen jerga ni otro tipo de evidencia", () => {
  for (const id of PREGUNTAS) {
    for (const idioma of ["en", "es"] as const) {
      const pregunta = leerTexto(idioma, `ayuda.${id}Q`);
      const respuesta = leerTexto(idioma, `ayuda.${id}A`);
      assert.equal(JERGA.test(pregunta), false, pregunta);
      assert.equal(JERGA.test(respuesta), false, respuesta);
      assert.doesNotMatch(`${pregunta} ${respuesta}`, /pdf|video|audio|documento/i);
    }
  }
  const claves = Object.keys(es.ayuda);
  for (const id of PREGUNTAS) {
    assert.equal(claves.includes(`${id}Q`), true);
    assert.equal(claves.includes(`${id}A`), true);
  }
  const pago = leerTexto("en", "ayuda.pagoA");
  assert.match(pago, /cannot send that balance to a bank/);
  assert.match(pago, /colones/);
  assert.doesNotMatch(pago, /Mile does not sign/);
  assert.match(leerTexto("es", "ayuda.pagoA"), /no puede enviar ese saldo a un banco/);
  assert.match(leerTexto("en", "ayuda.fondearA"), /Lock budget/);
  assert.match(leerTexto("es", "ayuda.fondearA"), /Bloquear presupuesto/);
  const costosEn = leerTexto("en", "ayuda.costosA");
  const costosEs = leerTexto("es", "ayuda.costosA");
  assert.match(costosEn, /0\.3% fee/);
  assert.match(costosEn, /US\$1\.994/);
  assert.match(costosEn, /US\$12\.44256/);
  assert.match(costosEs, /0,3 %/);
  assert.match(costosEs, /US\$1,994/);
  assert.match(costosEs, /US\$12,44256/);
  assert.doesNotMatch(costosEn, /does not add a fee|hyto (does not|doesn't) (add|charge)|hyto charges/i);
  assert.doesNotMatch(costosEs, /no agrega una tarifa|hyto no (agrega|cobra)|hyto cobra/i);
  assert.doesNotMatch(`${costosEn} ${costosEs}`, /USDC|Stellar|\bwallet\b|escrow|billetera/i);
  assert.doesNotMatch(leerTexto("en", "ayuda.cobrarA"), /USDC/);
  assert.doesNotMatch(leerTexto("es", "ayuda.cobrarA"), /USDC/);
  assert.match(leerTexto("en", "ayuda.sinPagarA"), /no button that returns/);
  assert.match(leerTexto("en", "ayuda.orgReembolsoA"), /confirm the amount/);
});
