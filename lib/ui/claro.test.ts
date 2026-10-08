import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_XLM_COMISION, CODIGO_XLM_COMISION } from "@/lib/escrow/comision";
import { AVISO_FEE_DISTINTA, AVISO_FEE_SIN_TRUSTLINE } from "@/lib/escrow/fee";
import { AVISO_DISPOSITIVO, AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { AVISO_HORIZON_RECEPTOR, AVISO_RECEPTOR_NO_LISTO, CODIGO_HORIZON_RECEPTOR, CODIGO_RECEPTOR_NO_LISTO } from "@/lib/escrow/receptorAvisos";
import {
  AVISO_USDC_FIRMANTE,
  AVISO_USDC_LENTO,
  AVISO_USDC_OTRA_CUENTA,
  AVISO_USDC_PENDIENTE,
  AVISO_USDC_SECUENCIA,
  AVISO_USDC_SIN_XLM,
  AVISO_USDC_VENCIDO,
  CODIGO_USDC_SIN_XLM,
} from "@/lib/integrante/avisosUsdc";
import { AVISO_YA_FONDEADO, CODIGO_YA_FONDEADO } from "@/lib/escrow/fondeo";
import { cajaDeFallo, detalleFallo, mensajeClaro, pasosDePago, tituloFallo } from "./claro";

test("technical payment errors tell the person what to do", () => {
  assert.equal(mensajeClaro("Could not submit the payment."), "That step did not finish. Try again.");
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
  assert.equal(mensajeClaro("Your Cavos session expired."), AVISO_REINGRESO);
  const origen = mensajeClaro(
    "kit/vault: add https://preview.example to this app's allowed web origins in the Cavos dashboard",
  );
  assert.match(origen, /signing window/);
  assert.equal(origen.includes("preview.example"), false);
  assert.equal(origen.includes("expired"), false);
  assert.equal(mensajeClaro("  "), "");
  assert.equal(mensajeClaro("Could not submit the payment.", "es"), "Ese paso no se completó. Intente de nuevo.");
  assert.equal(
    mensajeClaro("Ese paso no se completó. Intente de nuevo.", "es"),
    "Ese paso no se completó. Intente de nuevo.",
  );
  assert.equal(mensajeClaro("Wait 8 s before requesting another code", "es"), "Espere 8 s antes de pedir otro código");
  const saldo = mensajeClaro(
    "Your balance does not cover US$40.60 (this amount plus a US$1.00 reserve). You are short US$39.30.",
  );
  assert.equal(
    saldo,
    "Your balance does not cover US$40.60 (this amount plus a US$1.00 reserve). You are short US$39.30.",
  );
  assert.equal(saldo.includes("US$40.6 "), false);
  assert.equal(/US\$40\.6(?!0)/.test(saldo), false);
  assert.equal(saldo.includes("USDC"), false);
  assert.equal(
    mensajeClaro("Your balance does not cover US$40.60 (this amount plus a US$1.00 reserve). You are short US$39.30.", "es"),
    "Su saldo no cubre US$40,60 (este monto más una reserva de US$1,00). Le faltan US$39,30.",
  );
  assert.equal(
    mensajeClaro("Your balance does not cover US$6.00 (this amount plus a US$1.00 reserve). You are short US$6.00.", "es"),
    "Su saldo no cubre US$6,00 (este monto más una reserva de US$1,00). Le faltan US$6,00.",
  );
});

test("payout setup notices for old accounts keep their own words instead of the generic step error", () => {
  const generico = mensajeClaro("Could not submit the payment.");
  const saldo = mensajeClaro("Not enough XLM for the fee.");
  for (const aviso of [
    AVISO_DISPOSITIVO,
    AVISO_USDC_SIN_XLM,
    AVISO_USDC_SECUENCIA,
    AVISO_USDC_FIRMANTE,
    AVISO_USDC_VENCIDO,
    AVISO_USDC_PENDIENTE,
    AVISO_USDC_OTRA_CUENTA,
    AVISO_USDC_LENTO,
  ]) {
    assert.equal(mensajeClaro(aviso), aviso);
    assert.notEqual(mensajeClaro(aviso), generico);
    assert.notEqual(mensajeClaro(aviso), saldo);
    assert.notEqual(mensajeClaro(aviso, "es"), aviso);
  }
  assert.equal(mensajeClaro(CODIGO_USDC_SIN_XLM), AVISO_USDC_SIN_XLM);
  assert.match(mensajeClaro(AVISO_DISPOSITIVO, "es"), /navegador donde creó su cuenta/);
  assert.match(mensajeClaro(AVISO_USDC_SIN_XLM, "es"), /XLM de prueba/);
});

test("the failure box follows the step, not words in the message", () => {
  assert.equal(cajaDeFallo({ paso: "desplegar", codigo: CODIGO_RECEPTOR_NO_LISTO }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "fondear", codigo: null }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "fondear", codigo: CODIGO_YA_FONDEADO }), null);
  assert.equal(mensajeClaro(AVISO_YA_FONDEADO), "This budget is already locked on the network. Refresh this page. Do not lock it again.");
  assert.match(mensajeClaro(AVISO_YA_FONDEADO, "es"), /ya está bloqueado en la red/);
  assert.equal(cajaDeFallo({ paso: null, codigo: CODIGO_HORIZON_RECEPTOR }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "liberar", codigo: null }), "pago");
  assert.equal(cajaDeFallo({ paso: null, codigo: null }), null);
  assert.equal(tituloFallo("bloqueo"), "Budget not locked");
  assert.equal(detalleFallo("bloqueo", AVISO_RECEPTOR_NO_LISTO), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(tituloFallo("pago"), "Payment failed");
  assert.equal(detalleFallo("pago", AVISO_RECEPTOR_NO_LISTO), "No USDC left the escrow.");
  assert.equal(detalleFallo("pago", mensajeClaro(AVISO_XLM_COMISION)), mensajeClaro(AVISO_XLM_COMISION));
  assert.match(mensajeClaro(AVISO_FEE_DISTINTA), /0\.3%/);
  assert.match(mensajeClaro(AVISO_FEE_DISTINTA, "es"), /0,3 %/);
  assert.match(mensajeClaro(AVISO_FEE_SIN_TRUSTLINE), /error 13/);
  assert.equal(detalleFallo("pago", mensajeClaro(AVISO_FEE_SIN_TRUSTLINE)), mensajeClaro(AVISO_FEE_SIN_TRUSTLINE));
  assert.match(mensajeClaro(AVISO_XLM_COMISION), /another account/);
  assert.match(mensajeClaro(CODIGO_XLM_COMISION), /another account/);
  assert.match(mensajeClaro(AVISO_XLM_COMISION, "es"), /otra cuenta/);
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
