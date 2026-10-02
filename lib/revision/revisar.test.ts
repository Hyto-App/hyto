import assert from "node:assert/strict";
import test from "node:test";
import { tareasSemilla } from "../db/semilla";
import { guionFijo } from "./armar";
import { preguntarLaya } from "./laya";
import { revisar } from "./revisar";

const FOTO = { tipo: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) };

function groq(texto: string): Response {
  return Response.json({ choices: [{ message: { content: JSON.stringify({ texto, monto: null, fecha: null }) } }] });
}

test("en producción, sin Laya, no se usa el stub que aprueba", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  const resultado = await conLog(() =>
    revisar(tarea, FOTO, {
      claveGroq: "clave",
      layaUrl: null,
      produccion: true,
      fetchImpl: async () => groq("Banner visible."),
    }),
  );
  assert.equal(resultado.origen, "error");
  assert.equal(resultado.codigo, "sin_laya");
  assert.equal(resultado.veredicto, "insuficiente");
  assert.notEqual(resultado.texto, guionFijo("trabajo").texto);
});

test("un PDF no se manda al modelo y queda para revisión manual", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "comida");
  assert.ok(tarea);
  let llamadas = 0;
  const resultado = await conLog(() =>
    revisar(tarea, { tipo: "application/pdf", bytes: new TextEncoder().encode("%PDF-1.4") }, {
      claveGroq: "clave",
      layaUrl: "https://laya.example",
      fetchImpl: async () => {
        llamadas += 1;
        return groq("no");
      },
    }),
  );
  assert.equal(llamadas, 0);
  assert.equal(resultado.origen, "error");
  assert.equal(resultado.codigo, "pdf");
  assert.equal(resultado.veredicto, "insuficiente");
  assert.match(resultado.frase, /not approved automatically/);
});

test("si Scout responde y no hay Laya, el stub arma el veredicto", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  const resultado = await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: null,
    fetchImpl: async (input) => {
      assert.match(String(input), /api\.groq\.com\/openai\/v1\/chat\/completions/);
      return groq("Banner de ZEEK de frente.");
    },
  });
  assert.equal(resultado.origen, "stub");
  assert.equal(resultado.codigo, null);
  assert.equal(resultado.nota, 65);
  assert.equal(resultado.score, "65");
  assert.equal(resultado.veredicto, "parcial");
  assert.match(resultado.frase, /Banner de ZEEK de frente/);
  assert.match(resultado.frase, /Category booth/);
  assert.match(resultado.frase, /grade 65%/);
});

test("si Scout falla, no entra el guion fijo", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  const resultado = await conLog(() =>
    revisar(tarea, FOTO, {
      claveGroq: "clave-super-secreta",
      layaUrl: "https://laya.example",
      fetchImpl: async () => new Response("no", { status: 500 }),
    }),
  );
  assert.equal(resultado.origen, "error");
  assert.equal(resultado.codigo, "proveedor");
  assert.notEqual(resultado.texto, guionFijo("trabajo").texto);
  assert.equal(resultado.frase.includes("clave-super-secreta"), false);
});

test("si Laya falla, no entra el guion fijo", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "comida");
  assert.ok(tarea);
  let paso = 0;
  const resultado = await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    fetchImpl: async () => {
      paso += 1;
      if (paso === 1) return groq("Comprobante");
      return new Response("no", { status: 502 });
    },
  });
  assert.equal(resultado.origen, "error");
  assert.equal(resultado.codigo, "proveedor");
  assert.equal(resultado.nota, null);
  assert.equal(resultado.veredicto, "insuficiente");
  assert.equal(resultado.monto, null);
  assert.notEqual(resultado.texto, guionFijo("reembolso").texto);
});

test("si Laya no responde a tiempo, queda el error y no un pago", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  let paso = 0;
  const resultado = await conLog(() =>
    revisar(tarea, FOTO, {
      claveGroq: "clave",
      layaUrl: "https://laya.example",
      fetchImpl: async () => {
        paso += 1;
        if (paso === 1) return groq("Banner visible");
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      },
    }),
  );
  assert.equal(resultado.origen, "error");
  assert.equal(resultado.codigo, "tiempo");
  assert.equal(resultado.nota, null);
  assert.equal(resultado.veredicto, "insuficiente");
  assert.match(resultado.frase, /did not respond in time/);
});

test("cada fallo de una evidencia real deja el error y no el guion", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  const guion = guionFijo("trabajo");
  const casos: { codigo: string; frase: RegExp; fetchImpl?: typeof fetch; clave?: string | null; foto?: typeof FOTO | null }[] = [
    {
      codigo: "cupo",
      frase: /quota/,
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), { status: 429 }),
    },
    {
      codigo: "tiempo",
      frase: /did not respond in time/,
      fetchImpl: async () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      },
    },
    {
      codigo: "proveedor",
      frase: /could not finish/,
      fetchImpl: async () => new Response("mal", { status: 500 }),
    },
    {
      codigo: "respuesta",
      frase: /could not be read/,
      fetchImpl: async () => Response.json({ choices: [{ finish_reason: "length", message: { content: '{"texto":' } }] }),
    },
    { codigo: "sin_clave", frase: /not configured/, clave: null },
    { codigo: "sin_foto", frase: /no photo/i, foto: null },
  ];
  for (const caso of casos) {
    const logs: unknown[][] = [];
    const previo = console.error;
    console.error = (...args: unknown[]) => {
      logs.push(args);
    };
    try {
      const resultado = await revisar(tarea, caso.foto === undefined ? FOTO : caso.foto, {
        claveGroq: caso.clave === undefined ? "clave-super-secreta" : caso.clave,
        layaUrl: "https://laya.example",
        fetchImpl: caso.fetchImpl ?? (async () => new Response("no")),
      });
      assert.equal(resultado.origen, "error", caso.codigo);
      assert.equal(resultado.codigo, caso.codigo);
      assert.match(resultado.frase, caso.frase);
      assert.notEqual(resultado.texto, guion.texto);
      assert.equal(resultado.frase.includes("Mesa armada"), false);
      assert.equal(JSON.stringify(logs).includes("clave-super-secreta"), false);
      assert.equal(logs.length > 0, true);
      assert.match(JSON.stringify(logs[0]), new RegExp(caso.codigo));
    } finally {
      console.error = previo;
    }
  }
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

test("la revisión clasifica y después manda solo las preguntas de la factura", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "comida");
  assert.ok(tarea);
  assert.equal(tarea.tipo, "reembolso");
  const cuerpos: Array<{ model?: string; state?: string; questions?: Record<string, { type?: string; criteria?: unknown; instructions?: string }> }> =
    [];
  let paso = 0;
  const resultado = await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    fetchImpl: async (input, init) => {
      paso += 1;
      if (paso === 1) {
        assert.match(String(input), /api\.groq\.com/);
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  texto: "Team meal receipt, 12.40 USD, dated 2026-09-27.",
                  monto: "12.40",
                  fecha: "2026-09-27",
                }),
              },
            },
          ],
        });
      }
      assert.match(String(input), /\/v1\/systemone$/);
      const cuerpo = JSON.parse(String(init?.body)) as (typeof cuerpos)[number];
      cuerpos.push(cuerpo);
      if (paso === 2) return Response.json({ answers: { c1: { choice: "factura" } } });
      return Response.json({
        answers: {
          f1: { choice: "coincide_con_lo_pedido" },
          f2: { noul: true },
          f3: { noul: true },
          f4: { score: 2 },
          g1: { choice: "comida_o_bebida" },
          g2: { noul: true },
          g3: { noul: true },
          g4: { noul: true },
          g5: { score: 2 },
        },
      });
    },
  });
  assert.equal(resultado.origen, "scout");
  assert.equal(resultado.nota, 100);
  assert.equal(resultado.score, "100");
  assert.equal(resultado.veredicto, "cumplió");
  assert.equal(cuerpos.length, 2);
  assert.equal(cuerpos[0].model, "multilingual");
  assert.match(cuerpos[0].state ?? "", /Condition: Photo of the meal receipt/);
  assert.deepEqual(Object.keys(cuerpos[0].questions ?? {}), ["c1"]);
  assert.equal(cuerpos[1].questions?.g2?.instructions?.includes("Photo of the meal receipt"), true);
  assert.equal(Array.isArray(cuerpos[1].questions?.g5?.criteria), true);
  assert.equal((cuerpos[1].questions?.g5?.criteria as unknown[]).length, 3);
  assert.equal(cuerpos[1].questions?.t10, undefined);
});

test("si la descripción es otra cosa, la nota es 0 y no hay segunda llamada", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  let llamadasLaya = 0;
  const resultado = await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    fetchImpl: async (input) => {
      if (String(input).includes("groq")) return groq("A blurry selfie.");
      llamadasLaya += 1;
      return Response.json({ answers: { c1: { choice: "otra" } } });
    },
  });
  assert.equal(llamadasLaya, 1);
  assert.equal(resultado.nota, 0);
  assert.equal(resultado.score, "0");
  assert.equal(resultado.choice, "otra");
  assert.equal(resultado.veredicto, "insuficiente");
});

test("un reembolso sobre el tope queda en 40 aunque la factura sume 100", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "comida");
  assert.ok(tarea);
  assert.equal(tarea.tope, "15");
  const resultado = await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    fetchImpl: async (input, init) => {
      if (String(input).includes("groq")) {
        return Response.json({
          choices: [{ message: { content: JSON.stringify({ texto: "Receipt for 20.", monto: "20.00", fecha: "2026-09-27" }) } }],
        });
      }
      const cuerpo = JSON.parse(String(init?.body)) as {
        questions?: Record<string, unknown>;
      };
      if (cuerpo.questions && "c1" in cuerpo.questions && !("f1" in cuerpo.questions)) {
        return Response.json({ answers: { c1: { choice: "factura" } } });
      }
      return Response.json({
        answers: {
          f1: { choice: "coincide_con_lo_pedido" },
          f2: { noul: true },
          f3: { noul: true },
          f4: { score: 2 },
          g1: { choice: "comida_o_bebida" },
          g2: { noul: true },
          g3: { noul: true },
          g4: { noul: true },
          g5: { score: 2 },
        },
      });
    },
  });
  assert.equal(resultado.nota, 40);
  assert.equal(resultado.veredicto, "insuficiente");
});

test("la clave de Laya viaja solo si está configurada", async () => {
  const previa = process.env.LAYA_API_KEY;
  process.env.LAYA_API_KEY = "clave-compartida";
  try {
    let autorizacion = "";
    let llamadas = 0;
    await preguntarLaya("https://laya.example", "texto", "condición", async (_input, init) => {
      llamadas += 1;
      autorizacion = new Headers(init?.headers).get("authorization") ?? "";
      if (llamadas === 1) return Response.json({ answers: { c1: { choice: "otra" } } });
      return Response.json({});
    });
    assert.equal(llamadas, 1);
    assert.equal(autorizacion, "Bearer clave-compartida");
  } finally {
    if (previa === undefined) delete process.env.LAYA_API_KEY;
    else process.env.LAYA_API_KEY = previa;
  }
});
