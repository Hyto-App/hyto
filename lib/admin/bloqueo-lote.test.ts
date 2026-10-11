import assert from "node:assert/strict";
import test from "node:test";
import {
  empezarFirma,
  estaBloqueada,
  iniciarLote,
  listaParaBloquear,
  loteTerminado,
  pasosDeTarea,
  progresoLote,
  reintentarTarea,
  resumenLote,
  siguientePaso,
  terminarPaso,
  type EstadoLote,
  type FilaLote,
} from "./bloqueo-lote";

function fila(parcial: Partial<FilaLote> & { id: string }): FilaLote {
  return { estado: "pendiente", miembroId: "vol", cuentaCobro: true, contrato: null, fondeado: null, montoLote: "10", ...parcial };
}

const FILAS: FilaLote[] = [
  fila({ id: "a" }),
  fila({ id: "sin-persona", miembroId: "" }),
  fila({ id: "sin-cuenta", cuentaCobro: false }),
  fila({ id: "b", montoLote: "5.50" }),
  fila({ id: "bloqueada", contrato: "CLOCK", fondeado: true }),
  fila({ id: "pagada", estado: "pagado", contrato: "CPAID" }),
  fila({ id: "reembolso", montoLote: null, topeLote: "15" }),
];

test("el resumen cuenta lo que falta bloquear y solo ofrece las tareas con persona y cuenta de cobro", () => {
  const resumen = resumenLote(FILAS);
  // Unlocked: a, sin-persona, sin-cuenta, b, reembolso (its cap counts while the amount is unknown).
  assert.equal(resumen.n, 5);
  assert.equal(resumen.monto, "50.50");
  assert.deepEqual(resumen.listas, ["a", "b"]);
  assert.equal(resumen.k, 2);
  assert.equal(listaParaBloquear(fila({ id: "x", miembroId: "  " })), false);
  // Demo locks never pay anyone, so the payout account does not matter there.
  assert.deepEqual(resumenLote(FILAS, true).listas, ["a", "sin-cuenta", "b", "reembolso"]);
});

test("una tarea con contrato sin fondos solo pide la firma de fondear", () => {
  assert.deepEqual(pasosDeTarea({ contrato: null, fondeado: null }), ["desplegar", "fondear"]);
  assert.deepEqual(pasosDeTarea({ contrato: "C1", fondeado: false }), ["fondear"]);
  assert.equal(estaBloqueada({ estado: "pendiente", contrato: "C1", fondeado: false }), false);
  assert.equal(estaBloqueada({ estado: "pendiente", contrato: "C1", fondeado: true }), true);
  assert.equal(estaBloqueada({ estado: "pagado", contrato: "C1", fondeado: true }), false);
});

/** Simulates the clicks: each loop turn is one user gesture that signs exactly one step. */
function correr(estado: EstadoLote, falla: (tareaId: string, accion: string) => boolean) {
  const firmas: string[] = [];
  let clics = 0;
  let actual = estado;
  while (!loteTerminado(actual)) {
    const paso = siguientePaso(actual);
    assert.ok(paso);
    clics += 1;
    actual = empezarFirma(actual);
    // While a signature is open the next one is not offered.
    assert.equal(siguientePaso(actual), null);
    firmas.push(`${paso.tareaId}:${paso.accion}`);
    const fallo = falla(paso.tareaId, paso.accion);
    const contrato = paso.accion === "desplegar" ? `C-${paso.tareaId}` : paso.contrato;
    actual = terminarPaso(actual, fallo ? { ok: false, contrato: paso.accion === "fondear" ? contrato : null } : { ok: true, contrato });
  }
  return { actual, firmas, clics };
}

test("el lote firma una vez por clic, en orden, y salta las tareas sin persona", () => {
  const lote = iniciarLote(FILAS, resumenLote(FILAS).listas);
  assert.deepEqual(progresoLote(lote), { i: 1, n: 2, f: 1, g: 2 });
  const { actual, firmas, clics } = correr(lote, () => false);
  assert.deepEqual(firmas, ["a:desplegar", "a:fondear", "b:desplegar", "b:fondear"]);
  assert.equal(clics, 4);
  assert.deepEqual(actual.hechas, ["a", "b"]);
  assert.equal(firmas.some((firma) => firma.startsWith("sin-persona")), false);
  assert.equal(progresoLote(actual), null);
});

test("si una firma falla o se cierra, esa tarea queda para Reintentar y las demás siguen", () => {
  const filas = [fila({ id: "a" }), fila({ id: "b" }), fila({ id: "c" })];
  const lote = iniciarLote(filas, ["a", "b", "c"]);
  // b deploys, then its fund signature is closed.
  const { actual, firmas } = correr(lote, (id, accion) => id === "b" && accion === "fondear");
  assert.deepEqual(firmas, ["a:desplegar", "a:fondear", "b:desplegar", "b:fondear", "c:desplegar", "c:fondear"]);
  assert.deepEqual(actual.hechas, ["a", "c"]);
  assert.deepEqual(Object.keys(actual.fallidas), ["b"]);
  // Retry only needs the fund signature, on the contract that already exists.
  assert.deepEqual(actual.fallidas.b, { id: "b", pasos: ["fondear"], contrato: "C-b" });
  const otra = reintentarTarea(actual, "b");
  assert.deepEqual(siguientePaso(otra), { tareaId: "b", accion: "fondear", contrato: "C-b" });
  const fin = correr(otra, () => false);
  assert.deepEqual(fin.firmas, ["b:fondear"]);
  assert.deepEqual(fin.actual.hechas, ["a", "c", "b"]);
  assert.deepEqual(fin.actual.fallidas, {});
});

test("un fallo en el primer paso pide las dos firmas otra vez; reintentar a mitad de otra tarea espera su turno", () => {
  const filas = [fila({ id: "a" }), fila({ id: "b" })];
  let lote = iniciarLote(filas, ["a", "b"]);
  lote = terminarPaso(empezarFirma(lote), { ok: false, contrato: null });
  assert.deepEqual(lote.fallidas.a?.pasos, ["desplegar", "fondear"]);
  // b is halfway (deployed, fund next): Retry on a goes to the end so b keeps its fund signature.
  lote = terminarPaso(empezarFirma(lote), { ok: true, contrato: "C-b" });
  assert.deepEqual(progresoLote(lote), { i: 2, n: 2, f: 2, g: 2 });
  lote = reintentarTarea(lote, "a");
  assert.deepEqual(siguientePaso(lote), { tareaId: "b", accion: "fondear", contrato: "C-b" });
  const { firmas } = correr(lote, () => false);
  assert.deepEqual(firmas, ["b:fondear", "a:desplegar", "a:fondear"]);
});
