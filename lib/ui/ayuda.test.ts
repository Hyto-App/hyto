import assert from "node:assert/strict";
import test from "node:test";
import {
  ATAJOS,
  ENTRADA_MS,
  ESCRIBIENDO_MS,
  INICIO,
  PREGUNTAS,
  SIGUIENTES,
  buscarPreguntas,
  normalizarBusqueda,
  partesRespuesta,
  tiemposPartes,
  type PreguntaVisible,
} from "./ayuda";
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
  assert.doesNotMatch(pago, /colones|SINPE/i);
  assert.doesNotMatch(leerTexto("es", "ayuda.pagoA"), /colones|SINPE/i);
  assert.doesNotMatch(pago, /Mile does not sign/);
  assert.match(leerTexto("es", "ayuda.pagoA"), /no puede enviar ese saldo a un banco/);
  assert.match(leerTexto("en", "ayuda.fondearA"), /Lock budget/);
  assert.match(leerTexto("es", "ayuda.fondearA"), /Bloquear presupuesto/);
  const costosEn = leerTexto("en", "ayuda.costosA");
  const costosEs = leerTexto("es", "ayuda.costosA");
  assert.match(costosEn, /0\.3% fee/);
  assert.match(costosEn, /US\$1\.99 \(US\$2 minus a US\$0\.01 fee\)/);
  assert.match(costosEn, /US\$12\.44 \(US\$12\.48 minus a US\$0\.04 fee\)/);
  assert.match(costosEs, /0,3 %/);
  assert.match(costosEs, /US\$1,99 \(US\$2 menos comisión de US\$0,01\)/);
  assert.match(costosEs, /US\$12,44 \(US\$12,48 menos comisión de US\$0,04\)/);
  assert.doesNotMatch(costosEn, /does not add a fee|hyto (does not|doesn't) (add|charge)|hyto charges/i);
  assert.doesNotMatch(costosEs, /no agrega una tarifa|hyto no (agrega|cobra)|hyto cobra/i);
  assert.doesNotMatch(`${costosEn} ${costosEs}`, /USDC|Stellar|\bwallet\b|escrow|billetera/i);
  assert.doesNotMatch(leerTexto("en", "ayuda.cobrarA"), /USDC/);
  assert.doesNotMatch(leerTexto("es", "ayuda.cobrarA"), /USDC/);
  assert.match(leerTexto("en", "ayuda.sinPagarA"), /no button that returns/);
  assert.match(leerTexto("en", "ayuda.orgReembolsoA"), /confirm the amount/);
});

test("cada respuesta entra en 2 a 4 burbujas cortas", () => {
  for (const id of PREGUNTAS) {
    for (const idioma of ["en", "es"] as const) {
      const partes = partesRespuesta(leerTexto(idioma, `ayuda.${id}A`));
      assert.ok(partes.length >= 2 && partes.length <= 4, `${idioma} ${id}: ${partes.length} partes`);
      for (const parte of partes) {
        assert.ok(parte.length <= 140, `${idioma} ${id}: ${parte}`);
      }
    }
  }
  assert.deepEqual(partesRespuesta(leerTexto("es", "ayuda.pagoA")).slice(0, 2), [
    "Usted sube la evidencia del trabajo y la factura.",
    "Mile las revisa.",
  ]);
});

test("la ayuda en español habla de usted y sin cripto", () => {
  const tuteo = /(^|[^a-záéíóúüñ])(tú|tu|tus|te|ti|vos|contigo|puedes|tienes|subes|haces|quieres|debes|necesitas|estás|únete)([^a-záéíóúüñ]|$)/i;
  const cripto = /usdc|stellar|\bwallet\b|billetera|cripto|blockchain/i;
  for (const [clave, valor] of Object.entries(es.ayuda)) {
    assert.equal(tuteo.test(valor), false, `${clave}: ${valor}`);
    assert.equal(cripto.test(valor), false, `${clave}: ${valor}`);
    assert.equal(cripto.test(leerTexto("en", `ayuda.${clave}` as Parameters<typeof leerTexto>[1])), false, clave);
  }
  assert.match(leerTexto("es", "ayuda.pagoA"), /dólares digitales/);
  assert.match(leerTexto("en", "ayuda.pagoA"), /digital dollars/);
});

test("Mile ofrece 2 o 3 preguntas siguientes y nunca la misma", () => {
  for (const id of PREGUNTAS) {
    const siguientes = SIGUIENTES[id];
    assert.ok(siguientes.length >= 2 && siguientes.length <= 3, id);
    assert.equal(siguientes.includes(id), false, id);
    assert.equal(new Set(siguientes).size, siguientes.length, id);
  }
  for (const id of INICIO) assert.equal(PREGUNTAS.includes(id), true);
  assert.equal(leerTexto("es", "ayuda.tardaQ"), "¿Cuánto tarda?");
  assert.equal(leerTexto("es", "ayuda.otraQ"), "¿Y si me rechazan la evidencia?");
  assert.deepEqual(SIGUIENTES.pago.slice(0, 2), ["tarda", "otra"]);
});

test("cada burbuja espera a Mile escribiendo, salvo con movimiento reducido", () => {
  assert.ok(ESCRIBIENDO_MS >= 500 && ESCRIBIENDO_MS <= 700);
  assert.ok(ENTRADA_MS >= 150 && ENTRADA_MS <= 250);
  assert.deepEqual(tiemposPartes(3, true), [0, 0, 0]);
  const tiempos = tiemposPartes(3, false);
  assert.equal(tiempos[0], ESCRIBIENDO_MS);
  for (let indice = 1; indice < tiempos.length; indice += 1) {
    const espera = tiempos[indice] - tiempos[indice - 1] - ENTRADA_MS;
    assert.ok(espera >= 500 && espera <= 700, String(espera));
  }
});

test("Mile no promete tiempos: ninguna respuesta dice «en segundos» ni \"in seconds\"", () => {
  for (const idioma of ["es", "en"] as const) {
    for (const id of PREGUNTAS) {
      assert.doesNotMatch(leerTexto(idioma, `ayuda.${id}A`), /en segundos|in seconds/i, `${idioma} ${id}`);
    }
  }
});
