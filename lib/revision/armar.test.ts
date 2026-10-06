import assert from "node:assert/strict";
import test from "node:test";
import { armarVeredicto, cerrar, desdeGuion, fraseConNota, fraseDe, guionFijo, limitarNotaReembolso, motivosReembolso } from "./armar";
import { TOPE_FALTA_SERIA, TOPE_NOTA_REEMBOLSO } from "./pesos";

test("el guion de un trabajo queda en 65 por ciento", () => {
  const resultado = desdeGuion("trabajo", null);
  assert.equal(resultado.nota, 65);
  assert.equal(resultado.score, "65");
  assert.equal(resultado.veredicto, "parcial");
  assert.equal(resultado.origen, "guion");
  assert.equal(resultado.choice, "stand");
  assert.equal(resultado.noul, false);
  assert.equal(resultado.monto, null);
  assert.match(resultado.frase, /Table set up/);
  assert.match(resultado.frase, /Category booth/);
  assert.match(resultado.frase, /grade 65%/);
});

test("el guion de un reembolso dentro del tope queda en 90 por ciento", () => {
  const resultado = desdeGuion("reembolso", "15");
  assert.equal(resultado.nota, 90);
  assert.equal(resultado.score, "90");
  assert.equal(resultado.veredicto, "cumplió");
  assert.equal(resultado.monto, "12.40");
  assert.equal(resultado.fecha, "2026-09-27");
});

test("un monto por encima del tope no llega a Completado, y el pago confirmado sigue limitado al tope", () => {
  assert.deepEqual(
    armarVeredicto({ tipo: "reembolso", tope: "10", monto: "12.40", fecha: "2026-09-27", score: "100" }),
    { nota: TOPE_FALTA_SERIA, veredicto: "parcial" },
  );
});

test("sin monto el reembolso no pasa de 40 por ciento", () => {
  assert.equal(
    armarVeredicto({ tipo: "reembolso", tope: "15", monto: null, fecha: "2026-09-27", score: "90" })?.nota,
    TOPE_NOTA_REEMBOLSO,
  );
  assert.equal(
    armarVeredicto({ tipo: "reembolso", tope: "15", monto: "0", fecha: "2026-09-27", score: "90" })?.nota,
    TOPE_NOTA_REEMBOLSO,
  );
});

test("sin fecha el reembolso baja a Parcial y no se hunde a 40", () => {
  assert.deepEqual(
    armarVeredicto({ tipo: "reembolso", tope: "15", monto: "12.40", fecha: null, score: "90" }),
    { nota: TOPE_FALTA_SERIA, veredicto: "parcial" },
  );
  assert.equal(armarVeredicto({ tipo: "reembolso", tope: "15", monto: "12.40", fecha: null, score: "70" })?.nota, 70);
});

test("un total impreso sin moneda no se toma como dólares y no pasa de 79", () => {
  assert.deepEqual(
    armarVeredicto({ tipo: "reembolso", tope: "15", monto: null, fecha: "2026-10-02", score: "100", montoSinUsd: true }),
    { nota: TOPE_FALTA_SERIA, veredicto: "parcial" },
  );
  assert.deepEqual(motivosReembolso({ tipo: "reembolso", tope: "15", monto: null, fecha: null, montoSinUsd: true }), [
    "moneda_sin_usd",
    "sin_fecha",
  ]);
  assert.deepEqual(motivosReembolso({ tipo: "trabajo", tope: null, monto: null, fecha: null }), []);
});

test("un reembolso ya bajo no sube al tope de seguridad", () => {
  assert.equal(
    limitarNotaReembolso(20, { tipo: "reembolso", tope: "10", monto: "12.40", fecha: "2026-09-27" }),
    20,
  );
});

test("el porcentaje sale solo del score", () => {
  assert.equal(armarVeredicto({ tipo: "trabajo", tope: null, monto: null, fecha: null, score: "40" })?.nota, 40);
  assert.equal(armarVeredicto({ tipo: "trabajo", tope: null, monto: null, fecha: null, score: "80" })?.nota, 80);
  assert.equal(armarVeredicto({ tipo: "trabajo", tope: null, monto: null, fecha: null, score: "80" })?.veredicto, "cumplió");
});

test("una falta grave deja la nota en 49 aunque el peso crudo siga en cumplió", () => {
  const cerrado = cerrar(
    "trabajo",
    null,
    { texto: "A different scene.", monto: null, fecha: null },
    { choice: "trabajo", noul: false, score: "80", motivos: ["no_coincide"] },
    "scout",
  );
  assert.equal(cerrado?.nota, 49);
  assert.equal(cerrado?.veredicto, "insuficiente");
  assert.equal(cerrado?.score, "49");
  assert.equal(cerrado?.frase.includes("@@"), false);
  assert.match(cerrado?.frase ?? "", /grade 49%/);
});

test("g2 falso no pasa de 79 y la falta de fecha tampoco", () => {
  assert.deepEqual(
    armarVeredicto({
      tipo: "reembolso",
      tope: "15",
      monto: "12.40",
      fecha: "2026-09-27",
      score: "80",
      motivos: ["gasto_no_razonable"],
    }),
    { nota: 79, veredicto: "parcial" },
  );
  assert.equal(
    armarVeredicto({
      tipo: "reembolso",
      tope: "15",
      monto: "12.40",
      fecha: null,
      score: "80",
      motivos: ["gasto_no_razonable"],
    })?.nota,
    TOPE_FALTA_SERIA,
  );
  assert.equal(
    armarVeredicto({ tipo: "trabajo", tope: null, monto: null, fecha: null, score: "90", motivos: ["otra"] })?.nota,
    49,
  );
});

test("la frase muestra el porcentaje", () => {
  const guion = guionFijo("trabajo");
  assert.match(fraseDe(guion.texto, guion), /Category booth, grade 65%/);
});

test("la frase usa la nota guardada aunque el texto traiga otro porcentaje", () => {
  assert.equal(fraseConNota("Receipt. Category receipt, grade 78%.", 58), "Receipt. Category receipt, grade 58%.");
  assert.equal(fraseConNota("Receipt. Category receipt, grade 58%.", 58), "Receipt. Category receipt, grade 58%.");
  assert.equal(fraseConNota(null, 58), null);
});
