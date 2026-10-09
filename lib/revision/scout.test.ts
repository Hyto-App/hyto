import assert from "node:assert/strict";
import test from "node:test";
import { FalloRevision } from "./fallo";
import { describirFoto, leerDescripcion, MODELO_VISION_DEFECTO, modeloVision, parametrosRazonamiento } from "./scout";

const FOTO = new Uint8Array([1, 2, 3]);

test("lee el texto, el monto y la fecha", () => {
  const descripcion = leerDescripcion('{"texto":"Factura de comida","monto":"12.40","fecha":"2026-09-27"}');
  assert.deepEqual(descripcion, { texto: "Factura de comida", monto: "12.40", fecha: "2026-09-27" });
});

test("un monto que no es cifra se deja vacío", () => {
  const descripcion = leerDescripcion('Listo {"texto":"Mesa","monto":null,"fecha":null}');
  assert.equal(descripcion?.texto, "Mesa");
  assert.equal(descripcion?.monto, null);
  assert.equal(descripcion?.fecha, null);
});

test("sin texto no hay descripción", () => {
  assert.equal(leerDescripcion('{"monto":"1"}'), null);
});

test("el pedido apaga el razonamiento y sube el tope de tokens", async () => {
  let cuerpo: Record<string, unknown> = {};
  const descripcion = await describirFoto(
    FOTO,
    "image/jpeg",
    "clave",
    async (_input, init) => {
      cuerpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ choices: [{ message: { content: '{"texto":"Mesa","monto":null,"fecha":null}' } }] });
    },
    undefined,
    {},
    {},
  );
  assert.equal(descripcion.texto, "Mesa");
  assert.equal(cuerpo.model, "qwen/qwen3.8-27b");
  assert.deepEqual(cuerpo.response_format, { type: "json_object" });
  assert.equal(cuerpo.reasoning_effort, "none");
  assert.equal(cuerpo.reasoning_format, "hidden");
  assert.equal(typeof cuerpo.max_completion_tokens === "number" && cuerpo.max_completion_tokens >= 1024, true);
  assert.equal(cuerpo.max_tokens, undefined);
});

test("GROQ_VISION_MODEL cambia el modelo y si falta sigue el de siempre", async () => {
  const previo = process.env.GROQ_VISION_MODEL;
  process.env.GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
  try {
    let cuerpo: Record<string, unknown> = {};
    await describirFoto(
      FOTO,
      "image/jpeg",
      "clave",
      async (_input, init) => {
        cuerpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json({ choices: [{ message: { content: '{"texto":"Mesa","monto":null,"fecha":null}' } }] });
      },
      undefined,
      {},
      {},
    );
    assert.equal(cuerpo.model, "meta-llama/llama-4-scout-17b-16e-instruct");
    assert.equal("reasoning_effort" in cuerpo, false);
    assert.equal("reasoning_format" in cuerpo, false);
    assert.deepEqual(cuerpo.response_format, { type: "json_object" });
  } finally {
    if (previo === undefined) delete process.env.GROQ_VISION_MODEL;
    else process.env.GROQ_VISION_MODEL = previo;
  }
  assert.equal(modeloVision({ NODE_ENV: "test" }), MODELO_VISION_DEFECTO);
  assert.equal(modeloVision({ NODE_ENV: "test", GROQ_VISION_MODEL: "  " }), MODELO_VISION_DEFECTO);
});

test("solo un modelo Qwen 3 recibe los parámetros de razonamiento", () => {
  assert.deepEqual(parametrosRazonamiento(MODELO_VISION_DEFECTO), { reasoning_effort: "none", reasoning_format: "hidden" });
  assert.deepEqual(parametrosRazonamiento("Qwen/Qwen3-32B"), { reasoning_effort: "none", reasoning_format: "hidden" });
  assert.deepEqual(parametrosRazonamiento("meta-llama/llama-4-maverick-17b-128e-instruct"), {});
  assert.deepEqual(parametrosRazonamiento("openai/gpt-oss-120b"), {});
});

test("sin clave de Groq no llama a la red", async () => {
  let llamadas = 0;
  await assert.rejects(
    () =>
      describirFoto(FOTO, "image/jpeg", "  ", async () => {
        llamadas += 1;
        return new Response("no");
      }),
    (error: unknown) => error instanceof FalloRevision && error.code === "sin_clave",
  );
  assert.equal(llamadas, 0);
});

test("un 429 es cupo agotado", async () => {
  const error = await falloDe(async () => new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), { status: 429 }));
  assert.equal(error.code, "cupo");
  assert.equal(error.status, 429);
  assert.match(error.mensaje, /quota/);
  assert.match(error.providerMessage, /Rate limit/);
});

test("un cuerpo de cuota sin 429 también es cupo", async () => {
  const error = await falloDe(
    async () => new Response(JSON.stringify({ error: { message: "You exceeded your token quota" } }), { status: 400 }),
  );
  assert.equal(error.code, "cupo");
  assert.equal(error.status, 400);
});

test("un 500 es error del proveedor y no deja la clave en el mensaje", async () => {
  const clave = "clave-super-secreta";
  const error = await falloDe(async () => new Response(`falló ${clave}`, { status: 500 }), clave);
  assert.equal(error.code, "proveedor");
  assert.equal(error.status, 500);
  assert.equal(error.providerMessage.includes(clave), false);
});

test("un fallo de red es error del proveedor", async () => {
  const error = await falloDe(async () => {
    throw new TypeError("fetch failed");
  });
  assert.equal(error.code, "proveedor");
});

test("un 400 de contexto largo no es cupo", async () => {
  const error = await falloDe(async () => new Response("context too long; tokens limit", { status: 400 }));
  assert.equal(error.code, "proveedor");
  assert.equal(error.status, 400);
});

test("un tiempo de espera no es una respuesta vacía", async () => {
  const error = await falloDe(async () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  });
  assert.equal(error.code, "tiempo");
  assert.match(error.mensaje, /did not respond in time/);
});

test("un JSON cortado no se lee como descripción", async () => {
  const error = await falloDe(
    async () =>
      Response.json({
        choices: [{ finish_reason: "length", message: { content: '{"texto":"Mesa armada, sin cerrar' } }],
      }),
  );
  assert.equal(error.code, "respuesta");
  assert.equal(error.providerMessage, "truncado");
});

async function falloDe(fetchImpl: typeof fetch, clave = "clave"): Promise<FalloRevision> {
  try {
    await describirFoto(FOTO, "image/jpeg", clave, fetchImpl, undefined, {}, {});
  } catch (error) {
    assert.ok(error instanceof FalloRevision);
    return error;
  }
  assert.fail("tenía que fallar");
}
