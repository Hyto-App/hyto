import assert from "node:assert/strict";
import test from "node:test";
import { consultarHasta } from "./consulta-escrow";

test("vuelve a leer con pausas hasta que el saldo deja de ser desconocido", async () => {
  const lecturas: (boolean | null)[] = [null, null, true];
  const esperas: number[] = [];
  const resultado = await consultarHasta({
    leer: async () => lecturas.shift() ?? null,
    listo: (valor) => valor !== null,
    pausas: [10, 20, 30],
    esperar: async (ms) => {
      esperas.push(ms);
    },
  });
  assert.deepEqual(resultado, { listo: true, valor: true });
  assert.deepEqual(esperas, [10, 20]);
});

test("un saldo cero conocido también termina la consulta", async () => {
  const resultado = await consultarHasta({ leer: async () => false, listo: (valor) => valor !== null, pausas: [] });
  assert.deepEqual(resultado, { listo: true, valor: false });
});

test("se agota sin inventar un valor cuando la lectura sigue fallando", async () => {
  let llamadas = 0;
  const resultado = await consultarHasta<boolean | null>({
    leer: async () => {
      llamadas += 1;
      if (llamadas % 2 === 0) throw new Error("502");
      return null;
    },
    listo: (valor) => valor !== null,
    pausas: [1, 1, 1],
    esperar: async () => {},
  });
  assert.deepEqual(resultado, { listo: false });
  assert.equal(llamadas, 4);
});

test("sin lectura inmediata espera antes de la primera y se detiene al desmontar", async () => {
  let vivo = true;
  const esperas: number[] = [];
  let llamadas = 0;
  const resultado = await consultarHasta({
    leer: async () => {
      llamadas += 1;
      vivo = false;
      return "pendiente";
    },
    listo: () => false,
    pausas: [5, 5, 5],
    inmediata: false,
    esperar: async (ms) => {
      esperas.push(ms);
    },
    vivo: () => vivo,
  });
  assert.deepEqual(resultado, { listo: false });
  assert.equal(llamadas, 1);
  assert.deepEqual(esperas, [5]);
});
