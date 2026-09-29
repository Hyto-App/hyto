import assert from "node:assert/strict";
import test from "node:test";
import { tareasSemilla } from "../db/semilla";
import { preguntarLaya } from "./laya";
import { revisar } from "./revisar";

const FOTO = { tipo: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) };

function groq(texto: string): Response {
  return Response.json({ choices: [{ message: { content: JSON.stringify({ texto, monto: null, fecha: null }) } }] });
}

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
  assert.equal(resultado.origen, "scout");
  assert.equal(resultado.veredicto, "parcial");
  assert.match(resultado.frase, /Banner de ZEEK de frente/);
  assert.match(resultado.frase, /Categoría stand/);
});

test("si Scout falla, entra el guion fijo", async () => {
  const tarea = tareasSemilla().find((item) => item.id === "stand");
  assert.ok(tarea);
  const resultado = await revisar(tarea, FOTO, {
    claveGroq: "clave",
    layaUrl: "https://laya.example",
    fetchImpl: async () => new Response("no", { status: 500 }),
  });
  assert.equal(resultado.origen, "guion");
  assert.match(resultado.texto, /Mesa armada/);
});

test("si Laya falla, entra el guion fijo", async () => {
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
  assert.equal(resultado.origen, "guion");
  assert.equal(resultado.monto, "12.40");
});

test("la clave de Laya viaja solo si está configurada", async () => {
  const previa = process.env.LAYA_API_KEY;
  process.env.LAYA_API_KEY = "clave-compartida";
  try {
    let autorizacion = "";
    await preguntarLaya("https://laya.example", "texto", "condición", async (_input, init) => {
      autorizacion = new Headers(init?.headers).get("authorization") ?? "";
      return Response.json({ choice: "stand", noul: true, score: "parcial" });
    });
    assert.equal(autorizacion, "Bearer clave-compartida");
  } finally {
    if (previa === undefined) delete process.env.LAYA_API_KEY;
    else process.env.LAYA_API_KEY = previa;
  }
});
