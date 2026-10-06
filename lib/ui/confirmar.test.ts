import assert from "node:assert/strict";
import test from "node:test";
import { crearConfirmacion } from "./confirmar";

function armar(accion: () => Promise<void>) {
  const eventos: string[] = [];
  const confirmar = crearConfirmacion(
    accion,
    { ocupado: (v) => eventos.push(`ocupado:${v}`), error: (m) => eventos.push(`error:${m}`), cerrar: () => eventos.push("cerrar") },
    (fallo) => (fallo instanceof Error ? fallo.message : "x"),
  );
  return { confirmar, eventos };
}

test("confirm runs the action once and closes", async () => {
  let llamadas = 0;
  const { confirmar, eventos } = armar(async () => {
    llamadas += 1;
  });
  await Promise.all([confirmar(), confirmar()]);
  assert.equal(llamadas, 1);
  assert.deepEqual(eventos, ["ocupado:true", "error:null", "cerrar", "ocupado:false"]);
});

test("a failure keeps the dialog open and shows the message", async () => {
  const { confirmar, eventos } = armar(async () => {
    throw new Error("No balance");
  });
  await confirmar();
  assert.ok(eventos.includes("error:No balance"));
  assert.ok(!eventos.includes("cerrar"));
  assert.equal(eventos.at(-1), "ocupado:false");
});

test("nothing runs until confirm is called (cancel path)", () => {
  let llamadas = 0;
  armar(async () => {
    llamadas += 1;
  });
  assert.equal(llamadas, 0);
});
