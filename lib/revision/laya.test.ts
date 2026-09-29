import assert from "node:assert/strict";
import test from "node:test";
import { cuerpoLaya, leerLaya, urlLaya } from "./laya";

test("la URL de Laya apunta a systemone", () => {
  assert.equal(urlLaya("https://ejemplo.ts.net"), "https://ejemplo.ts.net/v1/systemone");
  assert.equal(urlLaya("https://ejemplo.ts.net/v1/systemone/"), "https://ejemplo.ts.net/v1/systemone");
});

test("lee choice, noul y score de la respuesta", () => {
  const senales = leerLaya({
    answers: {
      choice: { choice: "factura" },
      noul: { noul: 0.82 },
      score: { score: "parcial" },
    },
  });
  assert.deepEqual(senales, { choice: "factura", noul: true, score: "parcial" });
});

test("un noul bajo es no", () => {
  const senales = leerLaya({
    choice: "trabajo",
    noul: 0.2,
    score: "insuficiente",
  });
  assert.equal(senales?.noul, false);
  assert.equal(senales?.score, "insuficiente");
});

test("una respuesta sin las tres señales no se usa", () => {
  assert.equal(leerLaya({ answers: { choice: { choice: "factura" } } }), null);
});

test("el pedido nombra las tres preguntas", () => {
  const cuerpo = cuerpoLaya("Mesa armada", "Banner visible") as {
    questions: { choice: { type: string }; noul: { type: string }; score: { type: string; criteria: string[] } };
  };
  assert.equal(cuerpo.questions.choice?.type, "choice");
  assert.equal(cuerpo.questions.noul?.type, "noul");
  assert.equal(cuerpo.questions.score?.type, "score");
  assert.deepEqual(cuerpo.questions.score.criteria, [
    "Casi no se ve lo pedido",
    "Se ve parte y falta algo",
    "Se ve lo pedido",
  ]);
});

test("el score usa el índice con mayor probabilidad", () => {
  const senales = leerLaya({
    answers: {
      choice: { choice: "otra" },
      noul: { noul: 0.91 },
      score: { type: "score", score: 1.2, probabilities: { "0": 0.1, "1": 0.7, "2": 0.2 } },
    },
  });
  assert.equal(senales?.noul, true);
  assert.equal(senales?.score, "parcial");
});

test("si el dos empata con el cero, queda el nivel más bajo", () => {
  const senales = leerLaya({
    choice: "trabajo",
    noul: false,
    score: { score: 1, probabilities: [0.4, 0.2, 0.4] },
  });
  assert.equal(senales?.score, "insuficiente");
});
