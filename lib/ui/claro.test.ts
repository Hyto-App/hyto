import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_HORIZON_RECEPTOR, AVISO_RECEPTOR_NO_LISTO, CODIGO_HORIZON_RECEPTOR, CODIGO_RECEPTOR_NO_LISTO } from "@/lib/escrow/receptorAvisos";
import { cajaDeFallo, detalleFallo, mensajeClaro, pasosDePago, tituloFallo } from "./claro";

test("technical payment errors tell the person what to do", () => {
  assert.equal(mensajeClaro("Could not submit the payment."), "That step didn't go through. Try again.");
  assert.match(mensajeClaro("Not enough XLM for the fee."), /test balance/);
  assert.match(mensajeClaro("The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM."), /test balance/);
  assert.match(mensajeClaro("HYTO_ESCROW_PLATFORM is missing"), /isn't complete/);
  assert.match(mensajeClaro("ESCROW_RECEIVER_TRUSTLINE_MISSING"), /Get ready to be paid/);
  assert.equal(mensajeClaro("This task has no escrow yet. Deploy and fund it first."), "Lock the budget before you pay.");
  assert.equal(
    mensajeClaro("The task has no payout wallet. Ask the volunteer to sign in and open the task."),
    "We don't have the volunteer's payout account yet. Ask them to sign in to Hyto and open the task.",
  );
  assert.equal(mensajeClaro(CODIGO_RECEPTOR_NO_LISTO), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(mensajeClaro(AVISO_RECEPTOR_NO_LISTO), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(mensajeClaro(CODIGO_HORIZON_RECEPTOR), AVISO_HORIZON_RECEPTOR);
  assert.equal(mensajeClaro(AVISO_HORIZON_RECEPTOR).includes("Get ready to be paid"), false);
  assert.equal(
    mensajeClaro("This wallet is not on Stellar testnet yet."),
    "This account isn't on the test network yet. Open Events and tap Get ready to be paid.",
  );
  assert.equal(mensajeClaro("Sign in to continue."), "Sign in to continue.");
  assert.equal(mensajeClaro("  "), "");
});

test("the failure box follows the step, not words in the message", () => {
  assert.equal(cajaDeFallo({ paso: "desplegar", codigo: CODIGO_RECEPTOR_NO_LISTO }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "fondear", codigo: null }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: null, codigo: CODIGO_HORIZON_RECEPTOR }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "liberar", codigo: null }), "pago");
  assert.equal(cajaDeFallo({ paso: null, codigo: null }), null);
  assert.equal(tituloFallo("bloqueo"), "Budget not locked");
  assert.equal(detalleFallo("bloqueo", AVISO_RECEPTOR_NO_LISTO), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(tituloFallo("pago"), "Payment failed");
  assert.equal(detalleFallo("pago", AVISO_RECEPTOR_NO_LISTO), "No USDC left the escrow.");
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
