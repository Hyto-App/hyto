import assert from "node:assert/strict";
import test from "node:test";
import { CRC_POR_USD, convertirAUsd, fraseFuenteTasa, reiniciarTasaCrc, tasaCrcVigente, tasaRespaldo } from "./divisas";

test("el respaldo de colones sigue en 505 y una tasa leída convierte con ese número", () => {
  assert.equal(CRC_POR_USD, 505);
  assert.equal(tasaRespaldo().fuente, "respaldo");
  assert.deepEqual(convertirAUsd(735000, "CRC"), { usd: "14.55", tasa: 505 });
  assert.deepEqual(convertirAUsd(735000, "CRC", 457.8), { usd: "16.06", tasa: 457.8 });
  assert.deepEqual(convertirAUsd(1240, "USD", 457.8), { usd: "12.40", tasa: 1 });
  assert.equal(convertirAUsd(735000, "EUR"), null);
  assert.match(fraseFuenteTasa("hacienda", "2026-10-07"), /Costa Rica reference selling rate for 2026-10-07/);
  assert.match(fraseFuenteTasa("respaldo", null), /fallback rate, last set by hand on 2026-10-04/);
});

test("la tasa de Hacienda se guarda y un fallo usa el respaldo etiquetado", async () => {
  reiniciarTasaCrc();
  let llamadas = 0;
  const fetchOk: typeof fetch = async () => {
    llamadas += 1;
    return Response.json({ venta: { fecha: "2026-10-07", valor: 457.8 }, compra: { fecha: "2026-10-07", valor: 453.46 } });
  };
  const ahora = 1_700_000_000_000;
  const primera = await tasaCrcVigente({ fetch: fetchOk, ahora, forzarRed: true });
  const segunda = await tasaCrcVigente({ fetch: fetchOk, ahora: ahora + 1_000, forzarRed: true });
  assert.equal(llamadas, 1);
  assert.deepEqual(primera, { colonesPorUsd: 457.8, fuente: "hacienda", fecha: "2026-10-07" });
  assert.deepEqual(segunda, primera);

  reiniciarTasaCrc();
  const caida = await tasaCrcVigente({
    fetch: async () => new Response("no", { status: 503 }),
    ahora,
    forzarRed: true,
  });
  assert.deepEqual(caida, tasaRespaldo());
  const rara = await tasaCrcVigente({
    fetch: async () => Response.json({ venta: { fecha: "ayer", valor: 1 } }),
    ahora: ahora + TTL_DESPUES(caida),
    forzarRed: true,
  });
  assert.equal(rara.fuente, "respaldo");
  reiniciarTasaCrc();
});

function TTL_DESPUES(tasa: { fuente: string }): number {
  assert.equal(tasa.fuente, "respaldo");
  return 16 * 60 * 1000;
}
