import assert from "node:assert/strict";
import test from "node:test";
import { FalloRevision } from "./fallo";
import { cuerpoLaya, leerLaya, preguntarLaya, urlLaya } from "./laya";

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

test("sin URL Laya no está configurada", async () => {
  const error = await falloLaya("", async () => new Response("no"));
  assert.equal(error.code, "sin_clave");
  assert.match(error.mensaje, /not configured/);
});

test("un tiempo de Laya es tiempo", async () => {
  const error = await falloLaya("https://laya.example", async () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  });
  assert.equal(error.code, "tiempo");
});

test("un HTTP de Laya es error del proveedor", async () => {
  const error = await falloLaya("https://laya.example", async () => new Response("no", { status: 500 }));
  assert.equal(error.code, "proveedor");
  assert.equal(error.status, 500);
});

test("una respuesta de Laya que no se lee es respuesta", async () => {
  const error = await falloLaya("https://laya.example", async () => Response.json({ answers: { choice: { choice: "factura" } } }));
  assert.equal(error.code, "respuesta");
});

async function falloLaya(base: string, fetchImpl: typeof fetch): Promise<FalloRevision> {
  try {
    await preguntarLaya(base, "texto", "condición", fetchImpl);
  } catch (error) {
    assert.ok(error instanceof FalloRevision);
    return error;
  }
  assert.fail("tenía que fallar");
}

test("el pedido nombra las tres preguntas", () => {
  const cuerpo = cuerpoLaya("Mesa armada", "Banner visible") as {
    questions: { choice: { type: string }; noul: { type: string }; score: { type: string; criteria: string[] } };
  };
  assert.equal(cuerpo.questions.choice?.type, "choice");
  assert.equal(cuerpo.questions.noul?.type, "noul");
  assert.equal(cuerpo.questions.score?.type, "score");
  assert.deepEqual(cuerpo.questions.score.criteria, [
    "The requested item is barely visible",
    "Part of it is visible, something is missing",
    "The requested item is clearly visible",
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

test("el índice más alto en dos es cumplió", () => {
  const senales = leerLaya({
    answers: {
      choice: { choice: "trabajo" },
      noul: { noul: 0.1 },
      score: { type: "score", score: 1.6, probabilities: { "0": "0.1", "1": "0.2", "2": "0.7" } },
    },
  });
  assert.equal(senales?.noul, false);
  assert.equal(senales?.score, "cumplió");
});

test("si el dos empata con el cero, queda el nivel más bajo", () => {
  const senales = leerLaya({
    choice: "trabajo",
    noul: false,
    score: { score: 1, probabilities: [0.4, 0.2, 0.4] },
  });
  assert.equal(senales?.score, "insuficiente");
});
