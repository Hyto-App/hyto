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
  assert.equal(
    mensajeClaro("Could not submit the payment."),
    "That step did not finish. Wait 30 seconds and try again. Do not set the money aside or pay again.",
  );
  assert.match(mensajeClaro("Not enough XLM for the fee."), /5 minutes/);
  assert.match(mensajeClaro("The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM."), /5 minutes/);
  assert.match(mensajeClaro("HYTO_ESCROW_PLATFORM is missing"), /not complete/);
  assert.match(mensajeClaro("ESCROW_RECEIVER_TRUSTLINE_MISSING"), /Get ready to be paid/);
  assert.equal(mensajeClaro("This task has no escrow yet. Deploy and fund it first."), "Lock the budget before you pay.");
  assert.equal(
    mensajeClaro(AVISO_SIN_COBRO),
    "You can't set the money aside yet: the volunteer has to sign in to Hyto and open the task once.",
  );
  assert.equal(
    mensajeClaro(AVISO_SIN_COBRO, "es"),
    "Todavía no puede apartar el dinero: la persona voluntaria tiene que entrar a Hyto y abrir la tarea una vez.",
  );
  assert.equal(mensajeClaro(AVISO_SIN_ASIGNAR, "es"), "Todavía no puede apartar el dinero: primero asigne la tarea a alguien.");
  assert.equal(mensajeClaro(CODIGO_RECEPTOR_NO_LISTO), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(mensajeClaro(AVISO_RECEPTOR_NO_LISTO), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(mensajeClaro(CODIGO_HORIZON_RECEPTOR), AVISO_HORIZON_RECEPTOR);
  assert.equal(mensajeClaro(AVISO_HORIZON_RECEPTOR).includes("Get ready to be paid"), false);
  assert.equal(
    mensajeClaro("This wallet is not on Stellar testnet yet."),
    "This account is not ready to receive a payment yet. Open [[configuracion]] and tap Get ready to be paid.",
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
  assert.equal(
    mensajeClaro("Could not submit the payment.", "es"),
    "Ese paso no se completó. Espere 30 segundos e intente de nuevo. No lo aparte ni lo pague de nuevo.",
  );
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
    "Your balance does not cover US$40.60 (this amount, plus US$1.00 that stays in your account). You are short US$39.30. Ask whoever funds this to send you US$39.30, or lower the amount.",
  );
  assert.equal(saldo.includes("US$40.6 "), false);
  assert.equal(/US\$40\.6(?!0)/.test(saldo), false);
  assert.equal(saldo.includes("USDC"), false);
  assert.equal(
    mensajeClaro("Your balance does not cover US$40.60 (this amount plus a US$1.00 reserve). You are short US$39.30.", "es"),
    "Su saldo no cubre US$40,60 (este monto, más US$1,00 que se queda en su cuenta). Le faltan US$39,30. Pídale a quien financia que le envíe US$39,30, o baje el monto.",
  );
  assert.equal(
    mensajeClaro("Your balance does not cover US$6.00 (this amount plus a US$1.00 reserve). You are short US$6.00.", "es"),
    "Su saldo no cubre US$6,00 (este monto, más US$1,00 que se queda en su cuenta). Le faltan US$6,00. Pídale a quien financia que le envíe US$6,00, o baje el monto.",
  );
});

test("payout setup notices for old accounts keep their own words instead of the generic step error", () => {
  const generico = mensajeClaro("Could not submit the payment.");
  const saldo = mensajeClaro("Not enough XLM for the fee.");
  for (const aviso of [
    AVISO_DISPOSITIVO,
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
  assert.equal(mensajeClaro(AVISO_USDC_SIN_XLM), AVISO_USDC_SIN_XLM);
  assert.notEqual(mensajeClaro(AVISO_USDC_SIN_XLM), generico);
  assert.equal(mensajeClaro(CODIGO_USDC_SIN_XLM), AVISO_USDC_SIN_XLM);
  assert.match(mensajeClaro(AVISO_DISPOSITIVO, "es"), /navegador donde creó su cuenta/);
  assert.match(mensajeClaro(AVISO_USDC_SIN_XLM, "es"), /5 minutos/);
});

test("the failure box follows the step, not words in the message", () => {
  assert.equal(cajaDeFallo({ paso: "desplegar", codigo: CODIGO_RECEPTOR_NO_LISTO }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "fondear", codigo: null }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "fondear", codigo: CODIGO_YA_FONDEADO }), null);
  assert.equal(mensajeClaro(AVISO_YA_FONDEADO), "The money is already set aside. Nothing else is needed.");
  assert.match(mensajeClaro(AVISO_YA_FONDEADO, "es"), /ya está apartado/);
  assert.equal(cajaDeFallo({ paso: null, codigo: CODIGO_HORIZON_RECEPTOR }), "bloqueo");
  assert.equal(cajaDeFallo({ paso: "liberar", codigo: null }), "pago");
  assert.equal(cajaDeFallo({ paso: null, codigo: null }), null);
  assert.equal(tituloFallo("bloqueo"), "Budget not locked");
  assert.equal(detalleFallo("bloqueo", AVISO_RECEPTOR_NO_LISTO), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(tituloFallo("pago"), "Payment failed");
  assert.equal(detalleFallo("pago", AVISO_RECEPTOR_NO_LISTO), "The money is still set aside. Tap Approve and pay again in 1 minute.");
  assert.equal(detalleFallo("pago", mensajeClaro(AVISO_XLM_COMISION)), mensajeClaro(AVISO_XLM_COMISION));
  assert.match(mensajeClaro(AVISO_XLM_COMISION), /5 minutes/);
  assert.match(mensajeClaro(CODIGO_XLM_COMISION), /5 minutes/);
  assert.match(mensajeClaro(AVISO_XLM_COMISION, "es"), /5 minutos/);
  assert.match(detalleFallo("pago", "Check again in 30 seconds. Do not pay again."), /30 seconds/);
  assert.match(mensajeClaro(AVISO_FEE_DISTINTA), /0\.3%/);
  assert.match(mensajeClaro(AVISO_FEE_DISTINTA, "es"), /0,3 %/);
  assert.match(mensajeClaro(AVISO_FEE_SIN_TRUSTLINE), /error 13/);
  assert.equal(detalleFallo("pago", mensajeClaro(AVISO_FEE_SIN_TRUSTLINE)), mensajeClaro(AVISO_FEE_SIN_TRUSTLINE));
});

test("each swallowed error keeps its own next step", () => {
  assert.match(mensajeClaro("Add a Stellar wallet before locking this payment."), /\[\[configuracion\]\]/);
  assert.match(mensajeClaro("Add a Stellar wallet before locking this payment.", "es"), /\[\[configuracion\]\]/);
  assert.match(mensajeClaro("Too many escrow reads. Wait a moment."), /1 minute/);
  assert.equal(mensajeClaro("Too many escrow reads. Wait a moment.").includes("did not finish"), false);
  assert.match(mensajeClaro("Too many signature requests. Wait a moment.", "es"), /1 minuto/);
  assert.match(mensajeClaro("Too many attempts. Wait a moment."), /1 minute/);
  assert.match(mensajeClaro("429"), /1 minute/);
  assert.equal(mensajeClaro("429").includes("connection"), false);
  assert.match(mensajeClaro("We couldn't finish Stellar testnet setup."), /\[\[configuracion\]\]/);
  assert.match(mensajeClaro("We couldn't fund the testnet account.", "es"), /Preparar el cobro/);
  const propia = mensajeClaro("We couldn't add the USDC trustline on Stellar testnet.");
  assert.match(propia, /half set up/);
  assert.equal(propia.includes("person who gets paid"), false);
  assert.match(mensajeClaro("We couldn't add the USDC trustline on Stellar testnet.", "es"), /a medias/);
  assert.match(mensajeClaro("ESCROW_RECEIVER_TRUSTLINE_MISSING"), /person who gets paid/);
  assert.match(mensajeClaro("ESCROW_RECEIVER_TRUSTLINE_MISSING", "es"), /Quien va a cobrar/);
  assert.match(mensajeClaro("Friendbot couldn't fund this testnet account. Try again."), /\[\[configuracion\]\]/);
  assert.equal(mensajeClaro("Friendbot couldn't fund this testnet account. Try again.").includes("another account"), false);
  assert.match(mensajeClaro("This account needs a little test balance for the network fee. Add some and try again."), /5 minutes/);
  assert.match(mensajeClaro("No connection. Check the network and try again.", "es"), /internet/);
  assert.match(mensajeClaro("The organizer and the receiver have to be different accounts."), /different/);
  assert.equal(mensajeClaro("The organizer and the receiver have to be different accounts.").includes("Get ready"), false);
  assert.match(
    mensajeClaro("This budget is already locked on the network. Refresh this page. Do not lock it again."),
    /Nothing else is needed/,
  );
  assert.equal(
    mensajeClaro("This budget is already locked on the network. Refresh this page. Do not lock it again.").includes("Refresh"),
    false,
  );
  assert.match(mensajeClaro("Stellar setup stays on testnet."), /\[\[ayuda\]\]/);
  assert.match(
    mensajeClaro(
      "The budget is on the network and saved to this task. Trustless Work is still indexing it. Wait a few seconds, then finish locking it. Do not lock it again.",
    ),
    /30 seconds/,
  );
  assert.match(
    mensajeClaro(
      "The payment was sent. Trustless Work has not shown the milestone as released yet. This task will be marked paid once it does. Do not pay again.",
      "es",
    ),
    /30 segundos/,
  );
  assert.match(mensajeClaro("Too many failed codes. Wait 15 minutes and try again."), /15 minutes/);
  assert.match(mensajeClaro("Too many demo sign-ins. Wait a moment."), /1 minute/);
  assert.equal(mensajeClaro("Too many demo sign-ins. Wait a moment.").includes("set the money aside"), false);
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
