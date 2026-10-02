import assert from "node:assert/strict";
import test from "node:test";
import { tareasSemilla } from "../db/semilla";
import { FalloRevision } from "./fallo";
import { conReintentos, esReintentable, INTENTOS_REVISION, PAUSAS_REINTENTO_MS, PRESUPUESTO_REVISION_MS, TOPE_GROQ_MS } from "./reintento";
import { revisar } from "./revisar";

const FOTO = { tipo: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) };

test("solo se reintenta un corte de tiempo, un 5xx o un fallo de red", () => {
  assert.equal(esReintentable(new FalloRevision("tiempo", { fuente: "laya" })), true);
  assert.equal(esReintentable(new FalloRevision("proveedor", { fuente: "groq", status: 500 })), true);
  assert.equal(esReintentable(new FalloRevision("proveedor", { fuente: "groq", status: 503 })), true);
  assert.equal(esReintentable(new FalloRevision("proveedor", { fuente: "laya", status: 408 })), true);
  assert.equal(esReintentable(new FalloRevision("proveedor", { fuente: "groq", status: null })), true);
  assert.equal(esReintentable(new TypeError("fetch failed")), true);
  assert.equal(esReintentable(new FalloRevision("proveedor", { fuente: "groq", status: 400 })), false);
  assert.equal(esReintentable(new FalloRevision("proveedor", { fuente: "groq", status: 401 })), false);
  assert.equal(esReintentable(new FalloRevision("proveedor", { fuente: "laya", status: 403 })), false);
  assert.equal(esReintentable(new FalloRevision("proveedor", { fuente: "laya", status: 404 })), false);
  assert.equal(esReintentable(new FalloRevision("cupo", { fuente: "groq", status: 429 })), false);
  assert.equal(esReintentable(new FalloRevision("respuesta", { fuente: "laya" })), false);
  assert.equal(esReintentable(new FalloRevision("sin_clave", { fuente: "groq" })), false);
  assert.equal(esReintentable(new FalloRevision("sin_foto", { fuente: "revision" })), false);
});

test("un fallo transitorio hace tres intentos con pausas cortas y para al acertar", async () => {
  const pausas: number[] = [];
  let llamadas = 0;
  const valor = await conReintentos(
    async () => {
      llamadas += 1;
      if (llamadas < INTENTOS_REVISION) throw new TypeError("fetch failed");
      return "listo";
    },
    {
      deadline: 60_000,
      topeIntentoMs: 8_000,
      ahora: () => 0,
      esperar: async (ms) => {
        pausas.push(ms);
      },
    },
  );
  assert.equal(valor, "listo");
  assert.equal(llamadas, INTENTOS_REVISION);
  assert.deepEqual(pausas, [...PAUSAS_REINTENTO_MS]);
});

test("un 4xx de configuración no espera ni vuelve a llamar", async () => {
  const pausas: number[] = [];
  let llamadas = 0;
  await assert.rejects(
    () =>
      conReintentos(
        async () => {
          llamadas += 1;
          throw new FalloRevision("proveedor", { fuente: "groq", status: 401, providerMessage: "invalid api key" });
        },
        {
          deadline: 60_000,
          topeIntentoMs: 8_000,
          ahora: () => 0,
          esperar: async (ms) => {
            pausas.push(ms);
          },
        },
      ),
    (error: unknown) => error instanceof FalloRevision && error.status === 401,
  );
  assert.equal(llamadas, 1);
  assert.deepEqual(pausas, []);
});

test("el presupuesto corta el intento que ya no cabe", async () => {
  let reloj = 0;
  let llamadas = 0;
  await assert.rejects(
    () =>
      conReintentos(
        async () => {
          llamadas += 1;
          reloj += TOPE_GROQ_MS;
          throw new FalloRevision("proveedor", { fuente: "groq", status: 502 });
        },
        {
          deadline: PRESUPUESTO_REVISION_MS,
          topeIntentoMs: TOPE_GROQ_MS,
          ahora: () => reloj,
          esperar: async (ms) => {
            reloj += ms;
          },
        },
      ),
    (error: unknown) => error instanceof FalloRevision && error.status === 502,
  );
  assert.equal(llamadas, 2);
});

test("Groq y Laya reintentan un 5xx y no un 401, y no llaman al pago", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  const urls: string[] = [];
  const pausas: number[] = [];
  let groq = 0;
  let laya = 0;
  const caido = await conLog(() =>
    revisar(tarea, FOTO, {
      claveGroq: "clave",
      layaUrl: "https://laya.example",
      esperar: async (ms) => {
        pausas.push(ms);
      },
      fetchImpl: async (input) => {
        const url = String(input);
        urls.push(url);
        if (url.includes("groq")) {
          groq += 1;
          if (groq < INTENTOS_REVISION) return new Response("no", { status: 502 });
          return Response.json({ choices: [{ message: { content: JSON.stringify({ texto: "Banner visible", monto: null, fecha: null }) } }] });
        }
        laya += 1;
        return new Response("no", { status: 503 });
      },
    }),
  );
  assert.equal(groq, INTENTOS_REVISION);
  assert.equal(laya, INTENTOS_REVISION);
  assert.deepEqual(pausas, [...PAUSAS_REINTENTO_MS, ...PAUSAS_REINTENTO_MS]);
  assert.equal(caido.origen, "error");
  assert.equal(caido.codigo, "proveedor");
  assert.equal(urls.some((url) => /firma|trustless|stellar\.expert|horizon/i.test(url)), false);

  let auth = 0;
  const configuracion = await conLog(() =>
    revisar(tarea, FOTO, {
      claveGroq: "clave",
      layaUrl: "https://laya.example",
      esperar: async () => {
        throw new Error("no debía esperar");
      },
      fetchImpl: async (input) => {
        auth += 1;
        assert.match(String(input), /groq/);
        return new Response(JSON.stringify({ error: { message: "Invalid API Key" } }), { status: 401 });
      },
    }),
  );
  assert.equal(auth, 1);
  assert.equal(configuracion.origen, "error");
  assert.equal(configuracion.codigo, "proveedor");
});

test("un corte de Laya se reintenta y Groq no se vuelve a llamar", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "comida");
  assert.ok(tarea);
  let groq = 0;
  let laya = 0;
  const resultado = await conLog(() =>
    revisar(tarea, FOTO, {
      claveGroq: "clave",
      layaUrl: "https://laya.example",
      esperar: async () => undefined,
      fetchImpl: async (input) => {
        if (String(input).includes("groq")) {
          groq += 1;
          return Response.json({
            choices: [{ message: { content: JSON.stringify({ texto: "Receipt", monto: "12.40", fecha: "2026-09-27" }) } }],
          });
        }
        laya += 1;
        if (laya < INTENTOS_REVISION) throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
        return Response.json({ answers: { c1: { choice: "otra" } } });
      },
    }),
  );
  assert.equal(groq, 1);
  assert.equal(laya, INTENTOS_REVISION);
  assert.equal(resultado.origen, "scout");
  assert.equal(resultado.veredicto, "insuficiente");
});

test("una respuesta ilegible no se reintenta", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  let llamadas = 0;
  const resultado = await conLog(() =>
    revisar(tarea, FOTO, {
      claveGroq: "clave",
      layaUrl: null,
      esperar: async () => {
        throw new Error("no debía esperar");
      },
      fetchImpl: async () => {
        llamadas += 1;
        return Response.json({ choices: [{ message: { content: "not-json" } }] });
      },
    }),
  );
  assert.equal(llamadas, 1);
  assert.equal(resultado.codigo, "respuesta");
  assert.equal(resultado.origen, "error");
});

async function conLog<T>(trabajo: () => Promise<T>): Promise<T> {
  const previo = console.error;
  console.error = () => undefined;
  try {
    return await trabajo();
  } finally {
    console.error = previo;
  }
}
