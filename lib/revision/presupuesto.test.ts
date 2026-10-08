import assert from "node:assert/strict";
import test from "node:test";
import { tareasSemilla } from "../db/semilla";
import { preguntarLaya } from "./laya";
import { RESERVA_LAYA_MS, TOPE_LAYA_MS } from "./reintento";
import { revisar } from "./revisar";

const FOTO = { tipo: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) };

const TRABAJO = {
  answers: {
    lugar: { choice: "stand_o_mesa" },
    v1: { choice: "es_lo_pedido" },
    v2: { score: 2 },
    v3: { noul: true },
    v4: { noul: false },
    t5: { choice: "armar_o_montar" },
    t6: { choice: "terminado" },
    t7: { noul: true },
    t8: { noul: true },
    t9: { noul: false },
    t10: { score: 2 },
  },
};

test("Laya's reserve keeps part of one budget away from the description", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  assert.ok(RESERVA_LAYA_MS < TOPE_LAYA_MS);
  const presupuestoMs = 3_000;
  const inicio = Date.now();
  let corteGroq = 0;
  const resultado = await silenciar(() =>
    revisar(tarea, FOTO, {
      claveGroq: "clave",
      layaUrl: "https://laya.example",
      presupuestoMs,
      esperar: async () => undefined,
      fetchImpl: (async (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            corteGroq = Date.now() - inicio;
            reject(init.signal?.reason);
          });
        })) as typeof fetch,
    }),
  );
  assert.equal(resultado.origen, "error");
  assert.equal(resultado.codigo, "tiempo");
  // A third of 3 s is held for Laya, so Groq is cut near 2 s, not at 3 s.
  assert.ok(corteGroq >= 1_700 && corteGroq < 2_700, `Groq was cut after ${corteGroq} ms`);
});

test("each Laya call has its own signal, and a timeout on the second does not repeat the first", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  const senales: AbortSignal[] = [];
  let clasificar = 0;
  let preguntas = 0;
  const resultado = await silenciar(() =>
    revisar(tarea, FOTO, {
      claveGroq: "clave",
      layaUrl: "https://laya.example",
      esperar: async () => undefined,
      fetchImpl: async (input, init) => {
        if (String(input).includes("groq")) {
          return Response.json({ choices: [{ message: { content: JSON.stringify({ texto: "A banner on a stand", monto: null, fecha: null }) } }] });
        }
        assert.ok(init?.signal);
        assert.equal(init.signal.aborted, false);
        senales.push(init.signal);
        const cuerpo = JSON.parse(String(init.body)) as { questions?: Record<string, unknown> };
        if (cuerpo.questions && "c1" in cuerpo.questions) {
          clasificar += 1;
          return Response.json({ answers: { c1: { choice: "trabajo" } } });
        }
        preguntas += 1;
        if (preguntas === 1) throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
        return Response.json(TRABAJO);
      },
    }),
  );
  assert.equal(clasificar, 1);
  assert.equal(preguntas, 2);
  assert.equal(new Set(senales).size, senales.length);
  assert.equal(resultado.origen, "scout");
});

test("without a wrapper, preguntarLaya still uses the signal it is given", async () => {
  const controlador = new AbortController();
  const vistas: (AbortSignal | null | undefined)[] = [];
  await preguntarLaya(
    "https://laya.example",
    "A banner on a stand",
    "Set up the stand",
    async (_input, init) => {
      vistas.push(init?.signal);
      const cuerpo = JSON.parse(String(init?.body)) as { questions?: Record<string, unknown> };
      if (cuerpo.questions && "c1" in cuerpo.questions) return Response.json({ answers: { c1: { choice: "trabajo" } } });
      return Response.json(TRABAJO);
    },
    controlador.signal,
  );
  assert.deepEqual(vistas, [controlador.signal, controlador.signal]);
});

/** AbortSignal.timeout does not hold the event loop open, so a ref'd timer keeps the test alive. */
async function silenciar<T>(trabajo: () => Promise<T>): Promise<T> {
  const previo = console.error;
  console.error = () => undefined;
  const vivo = setInterval(() => undefined, 1_000);
  try {
    return await trabajo();
  } finally {
    clearInterval(vivo);
    console.error = previo;
  }
}
