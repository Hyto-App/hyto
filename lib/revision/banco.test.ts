import assert from "node:assert/strict";
import test from "node:test";
import { CASOS_BANCO, compararResultados, correrCaso, leerResultados, type CasoBanco } from "./banco";

function caso(id: string): CasoBanco {
  const encontrado = CASOS_BANCO.find((item) => item.id === id);
  assert.ok(encontrado, id);
  return encontrado;
}

test("cada caso etiquetado da la banda y el motivo que espera", async () => {
  assert.equal(CASOS_BANCO.length, 9);
  assert.equal(new Set(CASOS_BANCO.map((item) => item.id)).size, CASOS_BANCO.length);
  for (const item of CASOS_BANCO) {
    const resultado = await correrCaso(item, { modo: "simulado" });
    assert.equal(resultado.origen, "scout", item.id);
    assert.equal(resultado.veredicto, item.esperado.veredicto, item.id);
    assert.equal(resultado.motivo, item.esperado.motivo, item.id);
    assert.equal(resultado.cumple, true, item.id);
    assert.equal(resultado.motivoCoincide, true, item.id);
    assert.equal(resultado.foto, `evidencias-prueba/${item.foto}`);
    assert.equal(resultado.laya.length, 2, item.id);
    assert.ok(resultado.respuestas, item.id);
  }
});

test("Little Caesars en colones llega a Laya convertido y queda en Completed", async () => {
  const resultado = await correrCaso(caso("recibo-little-caesars-crc"), { modo: "simulado" });
  assert.equal(resultado.nota, 100);
  assert.equal(resultado.veredicto, "cumplió");
  assert.equal(resultado.monto, "14.55");
  assert.equal(resultado.fecha, "2026-10-02");
  assert.equal(resultado.lectura?.moneda, "CRC");
  assert.equal(resultado.lectura?.montoOriginal, "₡7.350,00");
  assert.deepEqual(resultado.antes, { nota: 40, veredicto: "insuficiente", detalle: "Reported in #039: amount and date missing, dollars assumed." });
  const [clase, factura] = resultado.laya;
  assert.deepEqual(clase?.preguntas, ["c1"]);
  assert.deepEqual(factura?.preguntas, ["f1", "f2", "f3", "f4", "g1", "g2", "g3", "g4", "g5"]);
  for (const llamada of resultado.laya) {
    assert.match(llamada.estado, /Total in US dollars: 14\.55, converted by Hyto at 505 CRC per US dollar \(fallback rate, last set by hand on 2026-10-04\)\./);
    assert.match(llamada.estado, /Purchase date: 2026-10-02 \(printed as 02\/10\/2026\)\./);
    assert.match(llamada.estado, /Condition: Photo of the meal receipt$/);
  }
  assert.deepEqual(
    resultado.razones.map((razon) => razon.id),
    ["matches", "amount_date"],
  );
});

test("sin fecha la nota baja con su razón y no se hunde a 40", async () => {
  const resultado = await correrCaso(caso("recibo-sin-fecha"), { modo: "simulado" });
  assert.equal(resultado.nota, 78);
  assert.equal(resultado.veredicto, "parcial");
  assert.equal(resultado.monto, "13.66");
  assert.equal(resultado.fecha, null);
  assert.equal(resultado.razones[0]?.texto, "Receipt date missing");
  assert.match(resultado.laya[0]?.estado ?? "", /Purchase date: not shown\./);
});

test("sin moneda no se asumen dólares y la razón lo dice", async () => {
  const resultado = await correrCaso(caso("recibo-sin-moneda"), { modo: "simulado" });
  assert.equal(resultado.monto, null);
  assert.equal(resultado.lectura?.moneda, null);
  assert.equal(resultado.nota, 79);
  assert.equal(resultado.razones[0]?.texto, "Currency not shown");
  assert.equal(resultado.razones.some((razon) => razon.id === "amount_missing"), false);
  assert.match(resultado.laya[0]?.estado ?? "", /Currency: not shown, so the total was not converted to US dollars\./);
});

test("salón lleno y pinto con huevo ya no quedan en 0", async () => {
  for (const id of ["salon-lleno", "pinto-con-huevo"]) {
    const resultado = await correrCaso(caso(id), { modo: "simulado" });
    assert.equal(resultado.antes?.nota, 0, id);
    assert.equal((resultado.nota ?? 0) >= 80, true, id);
    assert.equal(resultado.veredicto, "cumplió", id);
    assert.match(resultado.laya[1]?.estado ?? "", /Evidence type: work, a place, or a scene the organizer asked to see\./, id);
  }
});

test("una corrida en vivo guarda lo que respondieron los modelos y nunca una clave", async () => {
  const previa = process.env.LAYA_API_KEY;
  process.env.LAYA_API_KEY = "clave-laya-secreta";
  const autorizaciones: string[] = [];
  const recibo = caso("recibo-little-caesars-crc");
  try {
    const resultado = await correrCaso(recibo, {
      modo: "vivo",
      foto: { bytes: new Uint8Array([1, 2, 3]), tipo: "image/jpeg" },
      claveGroq: "clave-groq-secreta",
      layaUrl: "https://laya.example",
      fetchImpl: async (input, init) => {
        autorizaciones.push(new Headers(init?.headers).get("authorization") ?? "");
        if (String(input).includes("api.groq.com")) {
          return Response.json({ choices: [{ message: { content: JSON.stringify(recibo.simulado.qwen) } }] });
        }
        const preguntas = Object.keys((JSON.parse(String(init?.body)) as { questions: Record<string, unknown> }).questions);
        if (preguntas.length === 1) return Response.json({ answers: { c1: { choice: "factura" } } });
        return Response.json({
          answers: Object.fromEntries(
            Object.entries(recibo.simulado.respuestas).map(([id, valor]) => [
              id,
              typeof valor === "string" ? { choice: valor } : typeof valor === "boolean" ? { noul: valor } : { score: valor },
            ]),
          ),
        });
      },
    });
    assert.deepEqual(autorizaciones, ["Bearer clave-groq-secreta", "Bearer clave-laya-secreta", "Bearer clave-laya-secreta"]);
    assert.equal(resultado.veredicto, "cumplió");
    assert.deepEqual(resultado.qwen, recibo.simulado.qwen);
    assert.deepEqual(resultado.laya[0]?.respuestas, { c1: { choice: "factura" } });
    const guardado = JSON.stringify(resultado);
    assert.equal(guardado.includes("clave-groq-secreta"), false);
    assert.equal(guardado.includes("clave-laya-secreta"), false);
    assert.equal(guardado.includes("Bearer"), false);
  } finally {
    if (previa === undefined) delete process.env.LAYA_API_KEY;
    else process.env.LAYA_API_KEY = previa;
  }
});

test("si un proveedor falla, el caso queda como error y no cumple", async () => {
  const resultado = await conLog(() =>
    correrCaso(caso("trabajo-stand-ok"), {
      modo: "vivo",
      foto: { bytes: new Uint8Array([1, 2, 3]), tipo: "image/jpeg" },
      claveGroq: "clave",
      layaUrl: "https://laya.example",
      fetchImpl: async () => new Response("no", { status: 500 }),
    }),
  );
  assert.equal(resultado.origen, "error");
  assert.equal(resultado.nota, null);
  assert.equal(resultado.cumple, false);
  assert.equal(resultado.respuestas, null);
  assert.deepEqual(resultado.razones, []);
});

test("comparar marca solo los casos que cambiaron", () => {
  const viejos = leerResultados({
    casos: [
      { id: "recibo-little-caesars-crc", nota: 40, veredicto: "insuficiente", motivo: "amount_missing" },
      { id: "trabajo-stand-ok", nota: 100, veredicto: "cumplió", motivo: "matches" },
      { id: "retirado", nota: 10, veredicto: "insuficiente", motivo: null },
      { id: "roto", veredicto: "otra cosa" },
    ],
  });
  assert.equal(viejos.length, 3);
  const cambios = compararResultados(viejos, [
    { id: "recibo-little-caesars-crc", nota: 100, veredicto: "cumplió", motivo: "matches" },
    { id: "trabajo-stand-ok", nota: 100, veredicto: "cumplió", motivo: "matches" },
    { id: "nuevo", nota: 79, veredicto: "parcial", motivo: "currency_unknown" },
  ]);
  assert.deepEqual(
    cambios.map((cambio) => [cambio.id, cambio.cambio]),
    [
      ["recibo-little-caesars-crc", true],
      ["trabajo-stand-ok", false],
      ["nuevo", true],
      ["retirado", true],
    ],
  );
  assert.equal(cambios[0]?.antes?.nota, 40);
  assert.equal(cambios[3]?.ahora, null);
  assert.deepEqual(leerResultados(null), []);
  assert.deepEqual(leerResultados({ casos: "no" }), []);
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
