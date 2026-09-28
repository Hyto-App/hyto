import assert from "node:assert/strict";
import test from "node:test";
import { enlaceCredencial, enlacePago, resumir, vistaAdmin } from "./vista";
import type { MemoriaAdmin } from "./tipos";

const VACIA: MemoriaAdmin = { decisiones: {}, proyecto: null, direccion: null };

test("el ejemplo de ZEEK resume presupuesto, bandeja e informe", () => {
  const vista = vistaAdmin(VACIA);
  assert.equal(vista.nombre, "ZEEK");
  assert.equal(vista.ejemplo, true);
  assert.deepEqual(vista.resumen, { presupuesto: "75", pagado: "0", pendiente: "75" });
  assert.deepEqual(
    vista.bandeja.map((tarea) => tarea.id),
    ["stand", "registro", "comida"],
  );
  assert.equal(vista.personas.length, 3);
  assert.equal(vista.personas[0]?.miembro, "Voluntario 1");
  assert.equal(vista.personas[0]?.tareas.length, 2);
  assert.equal(vista.personas[2]?.tareas[0]?.estado, "pendiente");
});

test("aprobar y pedir otra foto cambian el resumen sin inventar un pago", () => {
  const aprobada = vistaAdmin({
    ...VACIA,
    decisiones: { stand: "pagado", comida: "pagado", registro: "pendiente" },
  });
  assert.deepEqual(aprobada.resumen, { presupuesto: "75", pagado: "32.40", pendiente: "42.60" });
  assert.deepEqual(
    aprobada.bandeja.map((tarea) => tarea.id),
    [],
  );
  assert.equal(aprobada.tareas.find((tarea) => tarea.id === "stand")?.hashPago, null);
  assert.equal(enlacePago(aprobada.tareas[0]?.hashPago), null);
});

test("un proyecto propio no entra a la bandeja sin evidencia", () => {
  const vista = vistaAdmin({
    ...VACIA,
    proyecto: {
      nombre: "Ensayo",
      tareas: [{ id: "mesa", titulo: "Mesa", tipo: "trabajo", monto: "10" }],
    },
  });
  assert.equal(vista.propio, true);
  assert.equal(vista.nombre, "Ensayo");
  assert.deepEqual(resumir(vista.tareas), { presupuesto: "10", pagado: "0", pendiente: "10" });
  assert.equal(vista.bandeja.length, 0);
});

test("ver pago y la credencial solo aparecen con un enlace válido", () => {
  const hash = "a".repeat(64);
  assert.equal(enlacePago(hash), `https://stellar.expert/explorer/testnet/tx/${hash}`);
  assert.equal(enlacePago("abc"), null);
  assert.equal(enlacePago("  "), null);
  assert.equal(enlaceCredencial(null), null);
  assert.equal(enlaceCredencial("javascript:alert(1)"), null);
  assert.equal(enlaceCredencial("https://dapp.acta.build/c/1"), "https://dapp.acta.build/c/1");
});
