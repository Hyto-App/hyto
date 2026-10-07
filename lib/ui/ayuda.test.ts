import assert from "node:assert/strict";
import test from "node:test";
import { ATAJOS, PREGUNTAS, buscarPreguntas, normalizarBusqueda, type PreguntaVisible } from "./ayuda";
import { es, leerTexto } from "./diccionario";

const JERGA = /escrow|testnet|trustline|xdr|soroban|friendbot|mainnet/i;

test("la ayuda tiene atajos fijos y de 8 a 10 respuestas", () => {
  assert.deepEqual(
    ATAJOS.map((atajo) => atajo.id),
    ["tareas", "evidencia", "pago", "faq"],
  );
  assert.ok(PREGUNTAS.length >= 8 && PREGUNTAS.length <= 10);
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
});
