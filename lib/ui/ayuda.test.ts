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
  PARA,
  inicioPara,
  partesRespuesta,
  preguntasPara,
  siguientesPara,
  tiemposPartes,
  type PreguntaVisible,
  type Publico,
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
      assert.doesNotMatch(`${pregunta} ${respuesta}`, /video|audio|documento/i);
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
  assert.match(costosEn, /US\$1\.99 \(US\$2\.00 minus a US\$0\.01 fee\)/);
  assert.match(costosEn, /US\$12\.44 \(US\$12\.48 minus a US\$0\.04 fee\)/);
  assert.match(costosEs, /0,3 %/);
  assert.match(costosEs, /US\$1\.99 \(US\$2\.00 menos comisión de US\$0\.01\)/);
  assert.match(costosEs, /US\$12\.44 \(US\$12\.48 menos comisión de US\$0\.04\)/);
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
    "Usted sube su evidencia (foto, factura, PDF o lista).",
    "Mile la revisa.",
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

test("en el demo cada lado ve solo sus preguntas, y siempre hay 2 o 3 siguientes", () => {
  const organizador = preguntasPara("organizador");
  const voluntario = preguntasPara("voluntario");
  for (const id of ["fondear", "costos", "sinPagar", "orgReembolso"] as const) {
    assert.equal(voluntario.includes(id), false, id);
    assert.equal(organizador.includes(id), true, id);
  }
  for (const id of ["pago", "evidencia", "otra", "cobrar"] as const) {
    assert.equal(organizador.includes(id), false, id);
    assert.equal(voluntario.includes(id), true, id);
  }
  assert.deepEqual(preguntasPara("todos"), [...PREGUNTAS]);
  for (const id of PREGUNTAS) assert.ok(PARA[id]);
  for (const publico of ["organizador", "voluntario", "todos"] as Publico[]) {
    const validas = preguntasPara(publico);
    for (const id of inicioPara(publico)) assert.equal(validas.includes(id), true, `${publico} inicio ${id}`);
    for (const id of validas) {
      // Asking everything once in a row must never leave the person without next questions.
      const preguntadas: (typeof PREGUNTAS)[number][] = [];
      for (const pregunta of validas) {
        preguntadas.push(pregunta);
        const siguientes = siguientesPara(pregunta, publico, preguntadas);
        assert.ok(siguientes.length >= 2 && siguientes.length <= 3, `${publico} ${pregunta}: ${siguientes.length}`);
        assert.equal(siguientes.includes(pregunta), false);
        for (const siguiente of siguientes) assert.equal(validas.includes(siguiente), true, `${publico} ${pregunta} -> ${siguiente}`);
      }
      assert.ok(siguientesPara(id, publico).length >= 2);
    }
  }
  assert.deepEqual(siguientesPara("pago", "todos"), ["tarda", "otra", "costos"]);
  assert.equal(siguientesPara("pago", "voluntario").includes("costos"), false);
});
