import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_MEMORIA, guardarProyecto, leerMemoriaAdmin } from "./memoria";

test("si localStorage rechaza el guardado, avisa y conserva lo anterior", () => {
  const datos = new Map<string, string>();
  const anterior = globalThis.window;
  Object.assign(globalThis, {
    window: {
      localStorage: {
        getItem: (clave: string) => datos.get(clave) ?? null,
        setItem: (clave: string, valor: string) => {
          if (valor.includes("Ensayo")) throw new Error("quota");
          datos.set(clave, valor);
        },
      },
    },
  });

  try {
    const primero = guardarProyecto({
      nombre: "ZEEK",
      tareas: [{ id: "mesa", titulo: "Mesa", tipo: "trabajo", monto: "10" }],
    });
    assert.equal(primero.aviso, null);
    const segundo = guardarProyecto({
      nombre: "Ensayo",
      tareas: [{ id: "mesa", titulo: "Mesa", tipo: "trabajo", monto: "10" }],
    });
    assert.equal(segundo.aviso, AVISO_MEMORIA);
    assert.equal(leerMemoriaAdmin().proyecto?.nombre, "ZEEK");
  } finally {
    if (anterior) globalThis.window = anterior;
    else delete (globalThis as { window?: Window }).window;
  }
});
