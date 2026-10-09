import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_XLM_COMISION, CODIGO_XLM_COMISION } from "@/lib/escrow/comision";
import { AVISO_FEE_DISTINTA, AVISO_FEE_SIN_TRUSTLINE } from "@/lib/escrow/fee";
import { AVISO_DISPOSITIVO, AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { AVISO_HORIZON_RECEPTOR, AVISO_RECEPTOR_NO_LISTO, CODIGO_HORIZON_RECEPTOR, CODIGO_RECEPTOR_NO_LISTO } from "@/lib/escrow/receptorAvisos";
import { AVISO_SIN_ASIGNAR, AVISO_SIN_COBRO } from "@/lib/escrow/cobroAvisos";
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
  assert.match(mensajeClaro("Not enough XLM for the fee."), /practice money/);
  assert.match(mensajeClaro("The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM."), /practice money/);
  assert.match(mensajeClaro("HYTO_ESCROW_PLATFORM is missing"), /isn't complete/);
  assert.match(mensajeClaro("ESCROW_RECEIVER_TRUSTLINE_MISSING"), /Get ready to be paid/);
  assert.equal(mensajeClaro("This task has no escrow yet. Deploy and fund it first."), "Reserve the money before you pay.");
  assert.equal(
    mensajeClaro(AVISO_SIN_COBRO),
    "You can't reserve the money yet: the volunteer has to sign in to Hyto and open the task once.",
  );
  assert.equal(
    mensajeClaro(AVISO_SIN_COBRO, "es"),
    "Todavía no puede reservar el dinero: la persona voluntaria tiene que entrar a Hyto y abrir la tarea una vez.",
  );
  assert.equal(
    mensajeClaro(AVISO_SIN_ASIGNAR),
    "You can't reserve the money yet: assign the task to someone first.",
  );
  assert.equal(mensajeClaro(AVISO_SIN_ASIGNAR, "es"), "Todavía no puede reservar el dinero: primero asigne la tarea a alguien.");
  assert.equal(
    mensajeClaro(CODIGO_RECEPTOR_NO_LISTO),
    "The volunteer's account for receiving payments isn't ready yet. Ask them to open Events in Hyto and tap Get ready to be paid.",
  );
  assert.equal(mensajeClaro(AVISO_RECEPTOR_NO_LISTO), mensajeClaro(CODIGO_RECEPTOR_NO_LISTO));
  assert.match(mensajeClaro(CODIGO_HORIZON_RECEPTOR), /payment system/);
  assert.equal(mensajeClaro(AVISO_HORIZON_RECEPTOR).includes("Get ready to be paid"), false);
  assert.equal(
    mensajeClaro("This wallet is not on Stellar testnet yet."),
    "This account is not ready for practice payments yet. Open Events and tap Get ready to be paid.",
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
    "Your balance does not cover US$40.60 (this amount plus US$1.00 that always stays in your account). You are short US$39.30.",
  );
  assert.equal(saldo.includes("US$40.6 "), false);
  assert.equal(/US\$40\.6(?!0)/.test(saldo), false);
  assert.equal(saldo.includes("USDC"), false);
  assert.equal(saldo.includes("reserve"), false);
  assert.match(saldo, /always stays in your account/);
  assert.equal(
    mensajeClaro("Your balance does not cover US$40.60 (this amount plus a US$1.00 reserve). You are short US$39.30.", "es"),
    "Su saldo no cubre US$40,60 (este monto más US$1,00 que siempre queda en su cuenta). Le faltan US$39,30.",
  );
  assert.equal(
    mensajeClaro("Your balance does not cover US$6.00 (this amount plus a US$1.00 reserve). You are short US$6.00.", "es"),
    "Su saldo no cubre US$6,00 (este monto más US$1,00 que siempre queda en su cuenta). Le faltan US$6,00.",
  );
});

test("payout setup notices for old accounts keep their own words instead of the generic step error", () => {
  const generico = mensajeClaro("Could not submit the payment.");
  const saldo = mensajeClaro("Not enough XLM for the fee.");
  for (const aviso of [AVISO_DISPOSITIVO, AVISO_USDC_VENCIDO, AVISO_USDC_PENDIENTE, AVISO_USDC_LENTO]) {
    assert.equal(mensajeClaro(aviso), aviso);
    assert.notEqual(mensajeClaro(aviso), generico);
    assert.notEqual(mensajeClaro(aviso), saldo);
    assert.notEqual(mensajeClaro(aviso, "es"), aviso);
  }
  for (const aviso of [AVISO_USDC_SIN_XLM, AVISO_USDC_SECUENCIA, AVISO_USDC_FIRMANTE, AVISO_USDC_OTRA_CUENTA]) {
    const claro = mensajeClaro(aviso);
    assert.notEqual(claro, aviso);
    assert.notEqual(claro, generico);
    assert.notEqual(claro, saldo);
    assert.equal(/USDC|XLM|payout account|test network|wallet/i.test(claro), false, claro);
    assert.notEqual(mensajeClaro(aviso, "es"), aviso);
  }
  assert.equal(
    mensajeClaro(CODIGO_USDC_SIN_XLM),
    "Your account for receiving payments cannot cover the payment-system cost yet. Try again in a few minutes, or ask whoever runs Hyto.",
  );
  assert.match(mensajeClaro(AVISO_DISPOSITIVO, "es"), /navegador donde creó su cuenta/);
  assert.match(mensajeClaro(AVISO_USDC_SIN_XLM, "es"), /cuenta para recibir pagos/);
  assert.equal(/XLM|USDC|red de prueba/i.test(mensajeClaro(AVISO_USDC_SIN_XLM, "es")), false);
});

test("the failure box follows the step, not words in the message", () => {
  assert.equal(cajaDeFallo({ paso: "desplegar", codigo: CODIGO_RECEPTOR_NO_LISTO }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "fondear", codigo: null }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "fondear", codigo: CODIGO_YA_FONDEADO }), null);
  assert.equal(mensajeClaro(AVISO_YA_FONDEADO), "This money is already reserved. Refresh this page. Do not reserve it again.");
  assert.match(mensajeClaro(AVISO_YA_FONDEADO, "es"), /ya está reservado/);
  assert.equal(cajaDeFallo({ paso: null, codigo: CODIGO_HORIZON_RECEPTOR }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "liberar", codigo: null }), "pago");
  assert.equal(cajaDeFallo({ paso: null, codigo: null }), null);
  assert.equal(tituloFallo("bloqueo"), "Money not reserved");
  assert.equal(detalleFallo("bloqueo", AVISO_RECEPTOR_NO_LISTO), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(tituloFallo("pago"), "Payment failed");
  assert.equal(detalleFallo("pago", AVISO_RECEPTOR_NO_LISTO), "No money moved. It is still reserved for this task.");
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

const JERGA_VISIBLE = /\b(USDC|XLM|testnet|wallet|blockchain|escrow|milestone|Trustless|Stellar)\b|payout account|test network|red de prueba|billetera|en la cadena/i;

test("server notices that used to stay in English come out in plain language", () => {
  const casos: ReadonlyArray<readonly [string, string, RegExp]> = [
    ["Could not read the USDC balance.", "en", /Hyto balance/],
    ["Could not read the USDC balance.", "es", /saldo en Hyto/],
    ["This wallet is not on the network yet.", "es", /sistema de pagos/],
    [
      "The budget is on the network and saved to this task. Trustless Work is still indexing it. Wait a few seconds, then finish locking it. Do not lock it again.",
      "es",
      /sistema de pagos/,
    ],
    [
      "The payment was sent. Trustless Work has not shown the milestone as released yet. This task will be marked paid once it does. Do not pay again.",
      "en",
      /payment system/,
    ],
    ["Confirm an amount within the limit before deploying.", "es", /reservar el dinero/],
    ["Confirm an amount within the limit before funding.", "en", /finish reserving the money/],
    ["Could not reach Trustless Work.", "es", /sistema de pagos/],
    ["The payment contract is not valid.", "en", /payment reference/],
    [
      "This sign-in has no payout account. Sign in again and open the task so we know where to pay.",
      "es",
      /cuenta para recibir pagos/,
    ],
    [
      "The budget for this task is already locked to another payout account. Sign in with that wallet to submit evidence.",
      "en",
      /account for receiving payments/,
    ],
    ["Sign in again before setting up payouts.", "es", /preparar el cobro/],
    ["We couldn't open this payout account on the test network. Try again.", "es", /cuenta para recibir pagos/],
    ["We couldn't check the testnet account. Try again.", "en", /practice payments/],
    ["Testnet setup runs only when you sign up.", "es", /pagos de práctica/],
    ["We couldn't fund the testnet account.", "en", /practice money/],
    ["Could not save this session's wallet.", "es", /cuenta para recibir pagos/],
    ["This account needs a little test balance for the network fee. Add some and try again.", "en", /practice money/],
    ["The budget was sent, but we couldn't confirm it yet. Refresh and try again.", "es", /El dinero se envió/],
  ];
  for (const [aviso, idioma, esperado] of casos) {
    const claro = mensajeClaro(aviso, idioma === "es" ? "es" : "en");
    assert.match(claro, esperado, aviso);
    assert.equal(JERGA_VISIBLE.test(claro), false, claro);
    assert.notEqual(claro, aviso);
  }
});
