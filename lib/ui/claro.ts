import { AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";

export const TEXTO = {
  lockBudget: "Lock budget",
  finishLocking: "Finish locking",
  settingUp: "Setting up…",
  locking: "Locking…",
  approvePay: "Approve and pay",
  checking: "Checking…",
  approving: "Approving…",
  paying: "Paying…",
  viewChain: "View on blockchain",
  preparePayout: "Get ready to be paid",
  preparingPayout: "Getting ready…",
  payoutReady: "Ready to be paid",
  payoutDone: "Payout account ready",
  checkingPayout: "Checking your payout account…",
  saveProject: "Save project",
} as const;

const ESPERA_RED = "That step didn't go through. Try again.";
const SALDO_RED = "This account needs a little test balance for the network fee. Add some and try again.";
const LISTO_COBRO = "The person who gets paid isn't ready to receive it yet. They should open the task and tap Get ready to be paid.";

const EXACTO: Record<string, string> = {
  "Could not submit the payment.": ESPERA_RED,
  "Could not prepare the payment.": "We couldn't start that step. Try again.",
  "Could not sign the payment.": "We couldn't complete that step. Try again.",
  "Could not read the escrow.": "We couldn't check the budget. Try again.",
  "Could not submit the USDC trustline.": "We couldn't finish setting up payouts. Try again.",
  "Could not read the USDC trustline.": "We couldn't check whether this account can receive payment. Try again.",
  "Could not prepare the USDC trustline.": "We couldn't get this account ready to receive payment. Try again.",
  "Could not sign the USDC trustline.": "We couldn't confirm the payout setup. Try again.",
  "Could not read the Stellar account.": "We couldn't check the payout account. Try again.",
  "This session has no Stellar wallet. Sign in again to sign.": "Sign in again before you continue.",
  "This session has no Stellar wallet.": "Sign in again before you continue.",
  "This wallet is not on Stellar testnet yet.": "This account isn't on the test network yet. Sign in again and retry.",
  "The wallet is not a Stellar account.": "That doesn't look like a payout account. Sign in again.",
  "The wallet does not match this sign-in.": "That account doesn't match this sign-in. Sign in again.",
  "This session's wallet did not sign the XDR.": "The confirmation didn't match this sign-in. Sign in again and retry.",
  "The signed XDR is missing.": "The confirmation didn't arrive. Try again.",
  "The signed XDR is too long.": "The confirmation couldn't be sent. Try again.",
  "The transaction is not a testnet USDC trustline for this wallet.": "That confirmation doesn't match this account. Try again.",
  "Preparation did not return the XDR.": "We couldn't prepare that step. Try again.",
  "This task has no escrow yet. Deploy and fund it first.": "Lock the budget before you pay.",
  "The transaction does not deploy the escrow.": "The budget wasn't locked. Try Lock budget again.",
  "This task already has an escrow.": "This task already has its budget locked.",
  "The submit succeeded and Trustless did not return the contract.":
    "The budget was sent, but we couldn't confirm it yet. Refresh in a moment.",
  "The task has no payout wallet. Ask the volunteer to sign in and open the task.":
    "We don't have the volunteer's payout account yet. Ask them to sign in to Hyto and open the task.",
  "Review pending": "Wait until the photo review finishes before locking the budget.",
  "The milestone amount has to be greater than zero.": "The amount has to be greater than zero.",
  "Only the organizer prepares the payment.": "Only the organizer can lock the budget and pay.",
  "Only the dispute resolver can sign this resolution.": "Only the person who resolves disputes can do this.",
  "Not enough XLM for the fee.": SALDO_RED,
  "You rejected the signature.": "You cancelled the confirmation. Nothing was sent.",
  "Your Cavos session expired.": AVISO_REINGRESO,
  "Your Cavos session closed. Sign in again to sign.": AVISO_REINGRESO,
  "Cavos is not configured for sign-in.": "Sign-in isn't set up yet.",
  "Cavos is not configured.": "Sign-in isn't set up yet.",
  "Accounts are waiting for the Cavos app id.": "Account setup isn't available yet.",
  "The account did not land on Stellar.": "The payout account didn't open. Try again.",
  "Demo mode cannot prepare USDC.": "Demo mode can't set up payouts. Sign in with your email to continue.",
  "Demo mode: signatures are off": "Demo mode can't send payments. Sign in with your email to continue.",
  "The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM. If it is short, fund it with Friendbot.":
    SALDO_RED,
  "The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM.": SALDO_RED,
  "The account does not have enough XLM for the fee. Fund it with Friendbot on testnet and try again.": SALDO_RED,
  "Trustless Work rejected the request.": "The payment service rejected that step. Try again.",
};

const PATRONES: readonly (readonly [RegExp, string])[] = [
  [/HYTO_ESCROW_|three different accounts|platform account cannot|resolver cannot|admin account cannot/i, "Payment setup isn't complete on the server. Ask whoever runs Hyto."],
  [/Trustless Work did not authorize/i, "Payments aren't available right now. Ask whoever runs Hyto."],
  [/already released|already paid/i, "This task is already paid."],
  [/trustline|receiver/i, LISTO_COBRO],
  [/insufficient balance|not enough usdc|balance must be equal/i, "There isn't enough money set aside yet. Finish locking the budget, then pay."],
  [/fee-bump|friendbot|not enough xlm|\bxlm\b/i, SALDO_RED],
  [/xdr|escrow|signer|contract id|soroban|stellar/i, ESPERA_RED],
];

export function mensajeClaro(mensaje: string): string {
  const limpio = mensaje.trim();
  if (!limpio) return limpio;
  const exacto = EXACTO[limpio];
  if (exacto) return exacto;
  for (const [patron, texto] of PATRONES) {
    if (patron.test(limpio)) return texto;
  }
  return limpio;
}

export type PasoFlujo = {
  nombre: string;
  estado: "done" | "now" | "later";
};

export function pasosDePago(entrada: {
  tieneVeredicto: boolean;
  revisionFallida: boolean;
  presupuestoListo: boolean;
  pagado: boolean;
}): PasoFlujo[] {
  if (entrada.pagado) {
    return [
      { nombre: "Review the photo", estado: "done" },
      { nombre: "Lock budget", estado: "done" },
      { nombre: "Pay", estado: "done" },
    ];
  }
  const revisionLista = entrada.tieneVeredicto || entrada.revisionFallida;
  const revision: PasoFlujo["estado"] = revisionLista ? "done" : "now";
  const bloqueo: PasoFlujo["estado"] = !revisionLista ? "later" : entrada.presupuestoListo ? "done" : "now";
  const pago: PasoFlujo["estado"] = revisionLista && entrada.presupuestoListo ? "now" : "later";
  return [
    { nombre: "Review the photo", estado: revision },
    { nombre: "Lock budget", estado: bloqueo },
    { nombre: "Pay", estado: pago },
  ];
}

export function frasePaso(accion: "desplegar" | "fondear" | "marcar" | "aprobar" | "liberar"): string {
  if (accion === "desplegar") return "Setting up the budget. Keep this page open. It can take a minute.";
  if (accion === "fondear") return "Locking the budget. Confirm in the window if it asks. It can take a minute.";
  if (accion === "marcar") return "Recording that the work is done.";
  if (accion === "aprobar") return "Approving the payment.";
  return "Sending the payment. Keep this page open.";
}
