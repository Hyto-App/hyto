import assert from "node:assert/strict";
import test from "node:test";
import { guardarEsperaReenvio, leerEsperaReenvio, olvidarEsperaReenvio } from "./esperaReenvio";

function caja(): Storage {
  const datos = new Map<string, string>();
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => {
      datos.set(clave, valor);
    },
    removeItem: (clave) => {
      datos.delete(clave);
    },
    clear: () => datos.clear(),
    key: () => null,
    get length() {
      return datos.size;
    },
  };
}

test("la espera que queda se lee del plazo, y al vencer se olvida", () => {
  const sitio = caja();
  const ahora = Date.parse("2026-10-08T12:00:00.000Z");
  guardarEsperaReenvio(45, ahora, sitio);
  assert.equal(leerEsperaReenvio(ahora + 20_000, sitio), 25);
  assert.equal(leerEsperaReenvio(ahora + 45_000, sitio), 0);
  assert.equal(leerEsperaReenvio(ahora + 46_000, sitio), 0);
  guardarEsperaReenvio(8, ahora, sitio);
  olvidarEsperaReenvio(sitio);
  assert.equal(leerEsperaReenvio(ahora, sitio), 0);
});
