import assert from "node:assert/strict";
import test from "node:test";
import { pedirCodigoHttp } from "./ingreso-codigo";

const NONCE = "0xabc123";
const AHORA = Date.parse("2026-10-08T12:00:00.000Z");

function pedido(cuerpo: unknown, ip: string): Request {
  return new Request("http://localhost/api/ingreso/codigo", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify(cuerpo),
  });
}

test("reenvía el 429 de Cavos con Retry-After y no el identificador que mande el navegador", async () => {
  let enviado = "";
  const respuesta = await pedirCodigoHttp(pedido({ email: " Ana@Example.com ", nonce: NONCE, app_id: "otro" }, "203.0.113.10"), {
    ahora: AHORA,
    appId: "app-prueba",
    fetchImpl: async (_url, init) => {
      enviado = String(init?.body ?? "");
      return new Response(
        JSON.stringify({ error: "rate_limited", message: "Please wait 53 seconds before requesting another code.", wait_seconds: 53 }),
        { status: 429, headers: { "content-type": "application/json", "retry-after": "17" } },
      );
    },
  });
  assert.equal(respuesta.status, 429);
  assert.equal(respuesta.headers.get("retry-after"), "53");
  const cuerpo = (await respuesta.json()) as { wait_seconds?: number; email?: string };
  assert.equal(cuerpo.wait_seconds, 53);
  assert.equal(cuerpo.email, undefined);
  assert.match(enviado, /"app_id":"app-prueba"/);
  assert.equal(enviado.includes("otro"), false);
  assert.match(enviado, /"email":"ana@example.com"/);
});

test("un envío aceptado pasa el estado y no sigue un redirect", async () => {
  const ok = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.11"), {
    ahora: AHORA,
    appId: "app-prueba",
    fetchImpl: async () => new Response(JSON.stringify({ status: "sent", expires_in: 600 }), { status: 200 }),
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { status: "sent", expires_in: 600 });

  let siguio = false;
  const redirect = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.12"), {
    ahora: AHORA + 1,
    appId: "app-prueba",
    fetchImpl: async () => {
      siguio = true;
      return new Response(null, { status: 302, headers: { location: "https://example.invalid/otro" } });
    },
  });
  assert.equal(siguio, true);
  assert.equal(redirect.status, 502);
  assert.equal(((await redirect.json()) as { error?: string }).error, "upstream_unreachable");
});

test("sin identificador, con un correo inválido o sin red no llama o no finge un 429", async () => {
  let llamadas = 0;
  const fetchImpl: typeof fetch = async () => {
    llamadas += 1;
    throw new TypeError("Failed to fetch");
  };
  const sinId = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.13"), { ahora: AHORA, appId: null, fetchImpl });
  assert.equal(sinId.status, 503);
  assert.equal(llamadas, 0);
  const correo = await pedirCodigoHttp(pedido({ email: "no-es-correo", nonce: NONCE }, "203.0.113.14"), { ahora: AHORA, appId: "app-prueba", fetchImpl });
  assert.equal(correo.status, 400);
  assert.equal(llamadas, 0);
  const nonce = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: "corto" }, "203.0.113.15"), { ahora: AHORA, appId: "app-prueba", fetchImpl });
  assert.equal(nonce.status, 400);
  assert.equal(llamadas, 0);
  const red = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.16"), { ahora: AHORA, appId: "app-prueba", fetchImpl });
  assert.equal(red.status, 502);
  assert.equal(llamadas, 1);
});

test("el tope propio responde 429 con segundos, no un error de red", async () => {
  let ultima = 200;
  let retry = "";
  for (let i = 0; i < 9; i += 1) {
    const respuesta = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.17"), {
      ahora: AHORA,
      appId: "app-prueba",
      fetchImpl: async () => new Response(JSON.stringify({ status: "sent" }), { status: 200 }),
    });
    ultima = respuesta.status;
    retry = respuesta.headers.get("retry-after") ?? "";
  }
  assert.equal(ultima, 429);
  assert.equal(retry, "60");
  const cuerpo = await (await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.17"), {
    ahora: AHORA,
    appId: "app-prueba",
    fetchImpl: async () => new Response("no", { status: 200 }),
  })).json() as { error?: string; wait_seconds?: number };
  assert.equal(cuerpo.error, "rate_limited");
  assert.equal(cuerpo.wait_seconds, 60);
});

test("un envío aceptado anuncia la espera de Cavos, y el siguiente toque antes de tiempo no llama", async () => {
  let llamadas = 0;
  const fetchImpl: typeof fetch = async () => {
    llamadas += 1;
    return new Response(JSON.stringify({ status: "sent", retry_after: 45 }), {
      status: 200,
      headers: { "content-type": "application/json", "retry-after": "45" },
    });
  };
  const primero = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.40"), {
    ahora: AHORA,
    appId: "app-prueba",
    fetchImpl,
  });
  assert.equal(primero.status, 200);
  assert.equal(primero.headers.get("retry-after"), "45");
  assert.equal(llamadas, 1);

  const temprano = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.40"), {
    ahora: AHORA + 20_000,
    appId: "app-prueba",
    fetchImpl,
  });
  assert.equal(temprano.status, 429);
  assert.equal(temprano.headers.get("retry-after"), "25");
  assert.equal(llamadas, 1);
  const cuerpo = (await temprano.json()) as { error?: string; wait_seconds?: number };
  assert.equal(cuerpo.error, "rate_limited");
  assert.equal(cuerpo.wait_seconds, 25);

  const aTiempo = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.40"), {
    ahora: AHORA + 45_000,
    appId: "app-prueba",
    fetchImpl,
  });
  assert.equal(aTiempo.status, 200);
  assert.equal(llamadas, 2);
});

test("sin espera de Cavos el reenvío sigue permitido, y la cuenta del cliente sale de Retry-After", async () => {
  const silencio = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.41"), {
    ahora: AHORA,
    appId: "app-prueba",
    fetchImpl: async () => new Response(JSON.stringify({ status: "sent", expires_in: 600 }), { status: 200 }),
  });
  assert.equal(silencio.status, 200);
  assert.equal(silencio.headers.get("retry-after"), "20");
  const sigue = await pedirCodigoHttp(pedido({ email: "ana@example.com", nonce: NONCE }, "203.0.113.41"), {
    ahora: AHORA + 1_000,
    appId: "app-prueba",
    fetchImpl: async () => new Response(JSON.stringify({ status: "sent" }), { status: 200 }),
  });
  assert.equal(sigue.status, 200);
});
