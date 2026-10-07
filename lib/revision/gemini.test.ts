import assert from "node:assert/strict";
import test from "node:test";
import { FalloRevision } from "./fallo";
import { describirFotoGemini, MODELO_GEMINI_DEFECTO, modeloGemini } from "./gemini";
import { MAX_TOKENS } from "./scout";

const FOTO = new Uint8Array([1, 2, 3]);

test("el pedido de Gemini pide JSON, razonamiento bajo y la misma foto", async () => {
  let cuerpo: Record<string, unknown> = {};
  let autorizacion = "";
  let url = "";
  const descripcion = await describirFotoGemini(FOTO, "image/jpeg", "clave-gemini", async (input, init) => {
    url = String(input);
    autorizacion = new Headers(init?.headers).get("authorization") ?? "";
    cuerpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({ choices: [{ message: { content: '{"texto":"Mesa de Gemini","monto":null,"fecha":null}' } }] });
  });
  assert.equal(descripcion.texto, "Mesa de Gemini");
  assert.match(url, /generativelanguage\.googleapis\.com\/v1beta\/openai\/chat\/completions$/);
  assert.equal(autorizacion, "Bearer clave-gemini");
  assert.equal(cuerpo.model, MODELO_GEMINI_DEFECTO);
  assert.equal(cuerpo.temperature, 0);
  assert.equal(cuerpo.max_completion_tokens, MAX_TOKENS);
  assert.equal(cuerpo.reasoning_effort, "low");
  assert.equal("reasoning_format" in cuerpo, false);
  assert.deepEqual(cuerpo.response_format, { type: "json_object" });
  const mensajes = cuerpo.messages as { content: { type: string; text?: string; image_url?: { url: string } }[] }[];
  assert.match(mensajes[0].content[0].text ?? "", /Reply with JSON only/);
  assert.match(mensajes[0].content[1].image_url?.url ?? "", /^data:image\/jpeg;base64,/);
});

test("GEMINI_VISION_MODEL cambia el modelo y si falta sigue el de siempre", async () => {
  const previo = process.env.GEMINI_VISION_MODEL;
  process.env.GEMINI_VISION_MODEL = "gemini-flash-latest";
  try {
    let cuerpo: Record<string, unknown> = {};
    await describirFotoGemini(FOTO, "image/jpeg", "clave", async (_input, init) => {
      cuerpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ choices: [{ message: { content: '{"texto":"Mesa","monto":null,"fecha":null}' } }] });
    });
    assert.equal(cuerpo.model, "gemini-flash-latest");
    assert.equal(cuerpo.reasoning_effort, "low");
  } finally {
    if (previo === undefined) delete process.env.GEMINI_VISION_MODEL;
    else process.env.GEMINI_VISION_MODEL = previo;
  }
  assert.equal(modeloGemini({ NODE_ENV: "test" }), MODELO_GEMINI_DEFECTO);
  assert.equal(modeloGemini({ NODE_ENV: "test", GEMINI_VISION_MODEL: "  " }), MODELO_GEMINI_DEFECTO);
});

test("sin clave de Gemini no llama a la red", async () => {
  let llamadas = 0;
  await assert.rejects(
    () =>
      describirFotoGemini(FOTO, "image/jpeg", "  ", async () => {
        llamadas += 1;
        return new Response("no");
      }),
    (error: unknown) => error instanceof FalloRevision && error.code === "sin_clave" && error.fuente === "gemini",
  );
  assert.equal(llamadas, 0);
});

test("un 429 de Gemini es cupo y un 500 no deja la clave", async () => {
  const cupo = await falloDe(
    async () => new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), { status: 429 }),
  );
  assert.equal(cupo.code, "cupo");
  assert.equal(cupo.fuente, "gemini");
  assert.equal(cupo.status, 429);

  const clave = "clave-gemini-secreta";
  const proveedor = await falloDe(async () => new Response(`falló ${clave}`, { status: 500 }), clave);
  assert.equal(proveedor.code, "proveedor");
  assert.equal(proveedor.fuente, "gemini");
  assert.equal(proveedor.providerMessage.includes(clave), false);
});

test("un JSON cortado de Gemini no se lee como descripción", async () => {
  const error = await falloDe(
    async () =>
      Response.json({
        choices: [{ finish_reason: "length", message: { content: '{"texto":"Mesa armada, sin cerrar' } }],
      }),
  );
  assert.equal(error.code, "respuesta");
  assert.equal(error.fuente, "gemini");
  assert.equal(error.providerMessage, "truncado");
});

test("una respuesta vacía de Gemini no se lee", async () => {
  const error = await falloDe(async () => Response.json({ choices: [{ message: { content: "" } }] }));
  assert.equal(error.code, "respuesta");
  assert.equal(error.fuente, "gemini");
});

async function falloDe(fetchImpl: typeof fetch, clave = "clave"): Promise<FalloRevision> {
  try {
    await describirFotoGemini(FOTO, "image/jpeg", clave, fetchImpl);
  } catch (error) {
    assert.ok(error instanceof FalloRevision);
    return error;
  }
  assert.fail("tenía que fallar");
}
