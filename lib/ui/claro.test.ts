import assert from "node:assert/strict";
import test from "node:test";
import { mensajeClaro, pasosDePago } from "./claro";

test("technical payment errors tell the person what to do", () => {
  assert.equal(mensajeClaro("Could not submit the payment."), "That step didn't go through. Try again.");
  assert.match(mensajeClaro("Not enough XLM for the fee."), /test balance/);
  assert.match(mensajeClaro("The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM."), /test balance/);
  assert.match(mensajeClaro("HYTO_ESCROW_PLATFORM is missing"), /isn't complete/);
  assert.match(mensajeClaro("ESCROW_RECEIVER_TRUSTLINE_MISSING"), /Get ready to be paid/);
  assert.equal(mensajeClaro("This task has no escrow yet. Deploy and fund it first."), "Lock the budget before you pay.");
  assert.equal(mensajeClaro("Sign in to continue."), "Sign in to continue.");
  assert.equal(mensajeClaro("  "), "");
});

test("the payment steps move from the photo to the locked budget to paid", () => {
  assert.deepEqual(
    pasosDePago({ tieneVeredicto: false, revisionFallida: false, presupuestoListo: false, pagado: false }).map((paso) => paso.estado),
    ["now", "later", "later"],
  );
  assert.deepEqual(
    pasosDePago({ tieneVeredicto: true, revisionFallida: false, presupuestoListo: false, pagado: false }).map((paso) => paso.estado),
    ["done", "now", "later"],
  );
  assert.deepEqual(
    pasosDePago({ tieneVeredicto: false, revisionFallida: true, presupuestoListo: false, pagado: false }).map((paso) => paso.estado),
    ["done", "now", "later"],
  );
  assert.deepEqual(
    pasosDePago({ tieneVeredicto: true, revisionFallida: true, presupuestoListo: false, pagado: false }).map((paso) => paso.estado),
    ["done", "now", "later"],
  );
  assert.deepEqual(
    pasosDePago({ tieneVeredicto: true, revisionFallida: false, presupuestoListo: true, pagado: false }).map((paso) => paso.estado),
    ["done", "done", "now"],
  );
  assert.deepEqual(
    pasosDePago({ tieneVeredicto: true, revisionFallida: false, presupuestoListo: true, pagado: true }).map((paso) => paso.estado),
    ["done", "done", "done"],
  );
});
