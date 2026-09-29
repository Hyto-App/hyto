import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_GUARDADO, guardarEvidencia, leerMemoria, olvidarEvidencia } from "./almacen";

test("si localStorage rechaza el guardado, avisa y no borra lo anterior", () => {
  const datos = new Map<string, string>();
  const anterior = globalThis.window;
  Object.assign(globalThis, {
    window: {
      localStorage: {
        getItem: (clave: string) => datos.get(clave) ?? null,
        setItem: (clave: string, valor: string) => {
          if (valor.includes("ev-nueva")) throw new Error("quota");
          datos.set(clave, valor);
        },
      },
    },
  });

  try {
    const primera = guardarEvidencia({ id: "ev-1", tareaId: "stand", blobId: "b", monto: null, fecha: null });
    assert.equal(primera, null);
    const segunda = guardarEvidencia({ id: "ev-nueva", tareaId: "comida", blobId: "b", monto: "1", fecha: "2026-09-27" });
    assert.equal(segunda, AVISO_GUARDADO);
    assert.equal(leerMemoria().evidencias.stand?.id, "ev-1");
    assert.equal(leerMemoria().evidencias.comida, undefined);
    assert.equal(olvidarEvidencia("stand"), null);
    assert.equal(leerMemoria().evidencias.stand, undefined);
  } finally {
    if (anterior) globalThis.window = anterior;
    else delete (globalThis as { window?: Window }).window;
  }
});
