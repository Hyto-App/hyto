import assert from "node:assert/strict";
import test from "node:test";
import { armarVeredicto, desdeGuion, fraseDe, guionFijo } from "./armar";

test("el guion de un trabajo queda en parcial", () => {
  const resultado = desdeGuion("trabajo", null);
  assert.equal(resultado.veredicto, "parcial");
  assert.equal(resultado.origen, "guion");
  assert.equal(resultado.choice, "stand");
  assert.equal(resultado.noul, true);
  assert.equal(resultado.monto, null);
  assert.match(resultado.frase, /Mesa armada/);
  assert.match(resultado.frase, /Categoría stand/);
});

test("el guion de un reembolso dentro del tope queda en cumplió", () => {
  const resultado = desdeGuion("reembolso", "15");
  assert.equal(resultado.veredicto, "cumplió");
  assert.equal(resultado.monto, "12.40");
  assert.equal(resultado.fecha, "2026-09-27");
});

test("un monto por encima del tope no cumple", () => {
  assert.equal(
    armarVeredicto({ tipo: "reembolso", tope: "10", monto: "12.40", fecha: "2026-09-27", noul: true, score: "cumplió" }),
    "insuficiente",
  );
});

test("sin monto o sin fecha el reembolso es insuficiente", () => {
  assert.equal(
    armarVeredicto({ tipo: "reembolso", tope: "15", monto: null, fecha: "2026-09-27", noul: true, score: "cumplió" }),
    "insuficiente",
  );
});

test("el sí o no de Laya no aprueba la evidencia", () => {
  assert.equal(
    armarVeredicto({ tipo: "trabajo", tope: null, monto: null, fecha: null, noul: true, score: "insuficiente" }),
    "insuficiente",
  );
  assert.equal(
    armarVeredicto({ tipo: "trabajo", tope: null, monto: null, fecha: null, noul: false, score: "cumplió" }),
    "cumplió",
  );
});

test("la frase junta el texto y las tres respuestas", () => {
  const guion = guionFijo("trabajo");
  assert.match(fraseDe(guion.texto, guion), /condición cumplida, evidencia parcial/);
});
