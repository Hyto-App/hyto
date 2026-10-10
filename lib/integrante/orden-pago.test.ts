import assert from "node:assert/strict";
import test from "node:test";
import { agruparPorEvento, idsMejorPagadas, ordenarPorPago, pagoNumerico, type TareaConPago } from "./orden-pago";

function tarea(
  parcial: Partial<TareaConPago> & Pick<TareaConPago, "id"> & { proyectoId?: string },
): TareaConPago & { proyectoId: string } {
  return {
    id: parcial.id,
    tipo: parcial.tipo ?? "trabajo",
    monto: parcial.monto === undefined ? "10" : parcial.monto,
    tope: parcial.tope === undefined ? null : parcial.tope,
    proyectoId: parcial.proyectoId ?? "zeek",
  };
}

test("el pago de un trabajo usa monto y el de un reembolso usa tope", () => {
  assert.equal(pagoNumerico(tarea({ id: "a", tipo: "trabajo", monto: "20", tope: "99" })), 20);
  assert.equal(pagoNumerico(tarea({ id: "b", tipo: "reembolso", monto: "40", tope: "15" })), 15);
  assert.equal(pagoNumerico(tarea({ id: "c", tipo: "reembolso", monto: "12", tope: null })), 12);
  assert.equal(pagoNumerico(tarea({ id: "d", tipo: "reembolso", monto: "12", tope: "  " })), 12);
  assert.equal(pagoNumerico(tarea({ id: "e", tipo: "trabajo", monto: " 18 " })), 18);
});

test("un monto vacío o no numérico no cuenta como pago", () => {
  assert.equal(pagoNumerico(tarea({ id: "vacio", monto: "" })), null);
  assert.equal(pagoNumerico(tarea({ id: "blanco", monto: "   " })), null);
  assert.equal(pagoNumerico(tarea({ id: "nulo", monto: null })), null);
  assert.equal(pagoNumerico(tarea({ id: "texto", monto: "abc" })), null);
  assert.equal(pagoNumerico(tarea({ id: "inf", monto: "Infinity" })), null);
  assert.equal(pagoNumerico(tarea({ id: "tope-malo", tipo: "reembolso", monto: "9", tope: "nope" })), null);
});

test("la insignia marca el pago más alto y los empates, e ignora ceros y vacíos", () => {
  const tareas = [
    tarea({ id: "alta", monto: "20" }),
    tarea({ id: "empate", monto: "20.00" }),
    tarea({ id: "baja", monto: "15" }),
    tarea({ id: "comida", tipo: "reembolso", monto: "50", tope: "20" }),
    tarea({ id: "vacio", monto: "" }),
    tarea({ id: "texto", monto: "n/a" }),
    tarea({ id: "cero", monto: "0" }),
    tarea({ id: "neg", monto: "-3" }),
  ];
  assert.deepEqual([...idsMejorPagadas(tareas)].sort(), ["alta", "comida", "empate"]);
});

test("sin un pago positivo no hay insignia", () => {
  assert.equal(idsMejorPagadas([]).size, 0);
  assert.equal(
    idsMejorPagadas([
      tarea({ id: "vacio", monto: "" }),
      tarea({ id: "texto", monto: "abc" }),
      tarea({ id: "cero", monto: "0" }),
      tarea({ id: "neg", monto: "-1" }),
    ]).size,
    0,
  );
});

test("el orden por defecto conserva la lista y el mayor pago es estable", () => {
  const tareas = [
    tarea({ id: "b", monto: "10", proyectoId: "uno" }),
    tarea({ id: "a", monto: "30", proyectoId: "uno" }),
    tarea({ id: "c", monto: "30", proyectoId: "dos" }),
    tarea({ id: "vacio", monto: "", proyectoId: "dos" }),
    tarea({ id: "texto", monto: "abc", proyectoId: "uno" }),
    tarea({ id: "cero", monto: "0", proyectoId: "dos" }),
  ];
  const original = tareas.map((item) => item.id);

  assert.deepEqual(
    ordenarPorPago(tareas, "defecto").map((item) => item.id),
    original,
  );
  assert.deepEqual(
    ordenarPorPago(tareas, "mayor").map((item) => item.id),
    ["a", "c", "b", "cero", "vacio", "texto"],
  );
  assert.deepEqual(
    tareas.map((item) => item.id),
    original,
  );
});

test("al ordenar por pago los eventos no se reagrupan por delante de un pago menor", () => {
  const tareas = [
    tarea({ id: "alta", monto: "30", proyectoId: "uno" }),
    tarea({ id: "media", monto: "20", proyectoId: "dos" }),
    tarea({ id: "baja", monto: "10", proyectoId: "uno" }),
  ];
  const ordenadas = ordenarPorPago(tareas, "mayor");
  assert.deepEqual(
    agruparPorEvento(ordenadas, "seguir").map((grupo) => ({
      proyectoId: grupo.proyectoId,
      ids: grupo.tareas.map((item) => item.id),
    })),
    [
      { proyectoId: "uno", ids: ["alta"] },
      { proyectoId: "dos", ids: ["media"] },
      { proyectoId: "uno", ids: ["baja"] },
    ],
  );
  assert.deepEqual(
    agruparPorEvento(tareas, "unir").map((grupo) => grupo.tareas.map((item) => item.id)),
    [
      ["alta", "baja"],
      ["media"],
    ],
  );
});
