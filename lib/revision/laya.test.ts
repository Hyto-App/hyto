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
  const cuerpo = cuerpoLaya("Mesa armada", "Banner visible") as { questions: Record<string, { type: string }> };
  assert.equal(cuerpo.questions.choice?.type, "choice");
  assert.equal(cuerpo.questions.noul?.type, "noul");
  assert.equal(cuerpo.questions.score?.type, "score");
});
