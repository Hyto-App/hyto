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
    await preguntarLaya(base, "texto", "condición", "trabajo", fetchImpl);
  } catch (error) {
    assert.ok(error instanceof FalloRevision);
    return error;
  }
  assert.fail("tenía que fallar");
}

test("el pedido de un trabajo con condición nombra la evidencia en el texto", () => {
  const cuerpo = leerCuerpo(cuerpoLaya("Table set up with the ZEEK banner.", "Banner visible and the table set up", "trabajo"));
  assert.equal(cuerpo.model, "multilingual");
  assert.equal(cuerpo.state, "Table set up with the ZEEK banner.\nCondition: Banner visible and the table set up");
  assert.equal(
    cuerpo.questions.choice.instructions,
    'Which label matches the written description? This work asks for: "Banner visible and the table set up". Count only evidence the description names, not words copied from the condition.',
  );
  assert.deepEqual(cuerpo.questions.choice.criteria, {
    trabajo: 'The description names the finished work this request asks for: "Banner visible and the table set up".',
    factura: "The description names an invoice or a receipt, not the finished work.",
    otra: "The description does not name the finished work. Use this for a blank wall, an unrelated scene, or a vague scene.",
  });
  assert.equal(
    cuerpo.questions.noul.instructions,
    'The written description explicitly names the evidence this condition requests: "Banner visible and the table set up". A blank wall, an empty room, or a description that never names that evidence makes this statement false.',
  );
  assert.equal(
    cuerpo.questions.score.instructions,
    'How much of the required work evidence does the written description name? Required evidence: "Banner visible and the table set up". Count a detail only when the description states it. Do not treat the condition text itself as something the description said.',
  );
  assert.deepEqual(cuerpo.questions.score.criteria, [
    "The description does not name the required evidence. A blank wall, an empty room, or an unrelated scene is this level.",
    "The description names some of the required evidence and leaves out at least one part the condition asks for.",
    "The description names every part the condition asks for.",
  ]);
  assertListaDeScore(cuerpo);
});

test("el pedido de un trabajo sin condición no inventa una condición", () => {
  const cuerpo = leerCuerpo(cuerpoLaya("A blank wall.", "", "trabajo"));
  assert.equal(cuerpo.state, "A blank wall.\nCondition: ");
  assert.equal(
    cuerpo.questions.choice.instructions,
    "Which label matches the written description of this work? Count only evidence the description names.",
  );
  assert.equal(cuerpo.questions.choice.criteria.trabajo, "The description names a finished piece of work.");
  assert.equal(
    cuerpo.questions.noul.instructions,
    "The written description explicitly names a finished piece of work and what was done. A blank wall, an empty room, or a description that names no finished work makes this statement false.",
  );
  assert.equal(cuerpo.questions.noul.instructions.includes("this condition"), false);
  assert.deepEqual(cuerpo.questions.score.criteria, [
    "The description does not name any finished work. A blank wall, an empty room, or an unrelated scene is this level.",
    "The description names some finished work and also says that part of it is missing or not shown.",
    "The description names the finished work and does not say that any part of it is missing or not shown.",
  ]);
  assertListaDeScore(cuerpo);
});

test("el pedido de un reembolso con condición pide el comprobante de esa condición", () => {
  const cuerpo = leerCuerpo(cuerpoLaya("Team meal receipt for 12.40 on 2026-09-27.", "Photo of the meal receipt", "reembolso"));
  assert.equal(cuerpo.state, "Team meal receipt for 12.40 on 2026-09-27.\nCondition: Photo of the meal receipt");
  assert.equal(
    cuerpo.questions.choice.instructions,
    'Which label matches the written description? This reimbursement asks for: "Photo of the meal receipt". Count only evidence the description names, not words copied from the condition.',
  );
  assert.deepEqual(cuerpo.questions.choice.criteria, {
    trabajo: "The description names finished work and does not name a receipt or an invoice.",
    factura: 'The description names a receipt or an invoice for this request: "Photo of the meal receipt".',
    otra: "The description does not name a receipt or an invoice. Use this for a meal with no document, a blank wall, or a vague scene.",
  });
  assert.equal(
    cuerpo.questions.noul.instructions,
    'The written description explicitly names a receipt or an invoice for the evidence this condition requests: "Photo of the meal receipt". A blank wall, an empty room, or a description that never names that evidence makes this statement false.',
  );
  assert.deepEqual(cuerpo.questions.score.criteria, [
    "The description does not name a receipt and does not name an invoice.",
    "The description names a receipt or an invoice, and it leaves out part of the required evidence.",
    "The description names a receipt or an invoice and names every part of the required evidence.",
  ]);
  assertListaDeScore(cuerpo);
});

test("el pedido de un reembolso sin condición exige el comprobante en el texto", () => {
  const cuerpo = leerCuerpo(cuerpoLaya("A plate of food.", "   ", "reembolso"));
  assert.equal(cuerpo.state, "A plate of food.\nCondition: ");
  assert.equal(
    cuerpo.questions.noul.instructions,
    "The written description explicitly names a receipt or an invoice. A meal, a blank wall, or a description that names no receipt and no invoice makes this statement false.",
  );
  assert.equal(cuerpo.questions.choice.criteria.factura, "The description names a receipt or an invoice.");
  assert.equal(cuerpo.questions.noul.instructions.includes("Photo of"), false);
  assert.deepEqual(cuerpo.questions.score.criteria, [
    "The description does not name a receipt and does not name an invoice.",
    "The description names a receipt or an invoice, and it does not state both an amount and a date.",
    "The description names a receipt or an invoice, and it states both an amount and a date.",
  ]);
  assertListaDeScore(cuerpo);
  const sinCondicion = leerCuerpo(cuerpoLaya("A plate of food.", "", "reembolso"));
  assert.deepEqual(cuerpo.questions, sinCondicion.questions);
});

function leerCuerpo(cuerpo: unknown): {
  model: string;
  state: string;
  questions: {
    choice: { type: string; instructions: string; criteria: { trabajo: string; factura: string; otra: string } };
    noul: { type: string; instructions: string };
    score: { type: string; instructions: string; criteria: string[] };
  };
} {
  return cuerpo as {
    model: string;
    state: string;
    questions: {
      choice: { type: string; instructions: string; criteria: { trabajo: string; factura: string; otra: string } };
      noul: { type: string; instructions: string };
      score: { type: string; instructions: string; criteria: string[] };
    };
  };
}

function assertListaDeScore(cuerpo: ReturnType<typeof leerCuerpo>) {
  assert.equal(cuerpo.questions.choice.type, "choice");
  assert.equal(cuerpo.questions.noul.type, "noul");
  assert.equal(cuerpo.questions.score.type, "score");
  assert.equal(Array.isArray(cuerpo.questions.score.criteria), true);
  assert.equal(cuerpo.questions.score.criteria.length, 3);
  assert.deepEqual(Object.keys(cuerpo.questions.choice.criteria), ["trabajo", "factura", "otra"]);
  assert.match(cuerpo.questions.score.criteria[0], /does not name/);
  assert.match(cuerpo.questions.score.criteria[2], /names /);
  assert.equal(cuerpo.questions.noul.instructions.includes("The photo meets this condition"), false);
  assert.equal(cuerpo.questions.choice.instructions.includes("What does the photo show?"), false);
}

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
