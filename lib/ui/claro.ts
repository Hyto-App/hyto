import {
  AVISO_PASSKEY_CANCELADA,
  AVISO_PASSKEY_FALLO,
  AVISO_PASSKEY_SIN_CLAVE,
  AVISO_PASSKEY_SIN_SOPORTE,
} from "@/lib/auth/avisosPasskey";
import { AVISO_DISPOSITIVO, AVISO_PASSKEY, AVISO_REINGRESO, AVISO_SIN_CUENTA_FIRMA } from "@/lib/escrow/firmarCliente";
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
import {
  AVISO_HORIZON_RECEPTOR,
  AVISO_RECEPTOR_NO_LISTO,
  CODIGO_HORIZON_RECEPTOR,
  CODIGO_RECEPTOR_NO_LISTO,
} from "@/lib/escrow/receptorAvisos";
import { AVISO_CONFIG, AVISO_CORREO, AVISO_DEMO, AVISO_GENERICO, AVISO_METODO_RECUPERACION, AVISO_ORIGEN_CAVOS, AVISO_SIN_CUENTA, AVISO_SIN_RESPALDO, AVISO_SPAM, AVISO_SPAM_ENLACE, AVISO_CODIGO_INVALIDO, AVISO_CODIGO_VENCIDO, AVISO_GOOGLE_BLOQUEADO, AVISO_GOOGLE_CERRADO, AVISO_RED, esOrigenCavos } from "@/lib/auth/errores";
import { AVISO_YA_FONDEADO, CODIGO_YA_FONDEADO } from "@/lib/escrow/fondeo";
import { AVISO_MONTO_INVALIDO, AVISO_MONTO_TARDE, AVISO_MONTO_TOPE } from "@/lib/escrow/monto";
import { MOTIVO_COPIA } from "@/lib/evidencia/copia";
import { AVISO_ENVIO_FALLIDO, AVISO_ENVIO_INCIERTO, AVISO_ENVIO_SIN_CONFIRMAR } from "@/lib/integrante/rutas";
import { type Clave, texto } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";

export const TEXTO = {
  lockBudget: texto("en", "pago.lockBudget"),
  finishLocking: texto("en", "pago.finishLocking"),
  settingUp: texto("en", "pago.settingUp"),
  locking: texto("en", "pago.locking"),
  approvePay: texto("en", "pago.approvePay"),
  checking: texto("en", "pago.checking"),
  approving: texto("en", "pago.approving"),
  paying: texto("en", "pago.paying"),
  viewChain: texto("en", "pago.viewChain"),
  checkAgain: texto("en", "pago.checkAgain"),
  preparePayout: texto("en", "pago.preparePayout"),
  preparingPayout: texto("en", "pago.preparingPayout"),
  payoutReady: texto("en", "pago.payoutReady"),
  payoutDone: texto("en", "pago.payoutDone"),
  checkingPayout: texto("en", "pago.checkingPayout"),
  saveProject: texto("en", "pago.saveProject"),
} as const;

const EXACTO: Record<string, Clave> = {
  "Could not submit the payment.": "errores.paso",
  "Could not prepare the payment.": "errores.noInicio",
  "Could not sign the payment.": "errores.noCompleto",
  "Could not read the escrow.": "errores.noPresupuesto",
  "Could not submit the USDC trustline.": "errores.noCobroFin",
  "Could not read the USDC trustline.": "errores.noCobroCheck",
  "Could not prepare the USDC trustline.": "errores.noCobroListo",
  "Could not sign the USDC trustline.": "errores.noCobroConfirm",
  "Could not read the Stellar account.": "errores.noCuentaPago",
  "This session has no Stellar wallet. Sign in again to sign.": "errores.entrarOtraVez",
  "This session has no Stellar wallet.": "errores.entrarOtraVez",
  "This wallet is not on Stellar testnet yet.": "errores.noTestnet",
  "The wallet is not a Stellar account.": "errores.noPareceCuenta",
  "The wallet does not match this sign-in.": "errores.noCoincideIngreso",
  "This session's wallet did not sign the XDR.": "errores.confirmacionNoCoincide",
  "The signed XDR is missing.": "errores.confirmacionNoLlego",
  "The signed XDR is too long.": "errores.confirmacionNoEnvio",
  "The transaction is not a testnet USDC trustline for this wallet.": "errores.confirmacionNoCuenta",
  "Preparation did not return the XDR.": "errores.noPreparar",
  "This task has no escrow yet. Deploy and fund it first.": "errores.bloquearAntes",
  "The transaction does not deploy the escrow.": "errores.presupuestoNoBloqueado",
  "This task already has an escrow.": "errores.yaBloqueado",
  [AVISO_YA_FONDEADO]: "errores.yaEnRed",
  "The submit succeeded and Trustless did not return the contract.": "errores.enviadoSinContrato",
  "The task has no payout wallet. Ask the volunteer to sign in and open the task.": "errores.sinWalletVoluntario",
  "Review pending": "errores.esperaRevision",
  "The milestone amount has to be greater than zero.": "errores.montoCero",
  "Only the organizer prepares the payment.": "errores.soloOrganizador",
  "Only the dispute resolver can sign this resolution.": "errores.soloResolver",
  "Not enough XLM for the fee.": "errores.saldoRed",
  "You rejected the signature.": "errores.cancelaste",
  "Your Cavos session expired.": "errores.reingreso",
  "Your Cavos session closed. Sign in again to sign.": "errores.reingreso",
  [AVISO_REINGRESO]: "errores.reingreso",
  [AVISO_SIN_CUENTA_FIRMA]: "errores.sinCuentaFirma",
  [AVISO_ORIGEN_CAVOS]: "errores.origenCavos",
  "Cavos is not configured for sign-in.": "errores.sinConfig",
  "Cavos is not configured.": "errores.sinConfig",
  "Accounts are waiting for the Cavos app id.": "errores.cuentasNo",
  "The account did not land on Stellar.": "errores.cuentaNoAbrio",
  "Demo mode cannot prepare USDC.": "errores.demoCobro",
  "Demo mode: signatures are off": "errores.demoPagos",
  "The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM. If it is short, fund it with Friendbot.":
    "errores.saldoRed",
  "The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM. If the account already exists, send a little test balance from another account, then try again.":
    "errores.saldoRed",
  "The v2 network does not accept a fee-bump. The Cavos account has to pay the fee in XLM.": "errores.saldoRed",
  "The account does not have enough XLM for the fee. Fund it with Friendbot on testnet and try again.": "errores.saldoRed",
  xlm_sin_comision: "errores.saldoRed",
  "This account needs a little test balance for the network fee. If the account already exists, send that balance from another account, then try again.":
    "errores.saldoRed",
  "Trustless Work rejected the request.": "errores.servicioRechazo",
  [CODIGO_RECEPTOR_NO_LISTO]: "errores.receptorNoListo",
  [AVISO_RECEPTOR_NO_LISTO]: "errores.receptorNoListo",
  [CODIGO_HORIZON_RECEPTOR]: "errores.horizonReceptor",
  [AVISO_HORIZON_RECEPTOR]: "errores.horizonReceptor",
  [AVISO_DISPOSITIVO]: "errores.dispositivo",
  [AVISO_PASSKEY]: "errores.passkey",
  [AVISO_PASSKEY_SIN_SOPORTE]: "errores.passkeySinSoporte",
  [AVISO_PASSKEY_SIN_CLAVE]: "errores.passkeySinClave",
  [AVISO_PASSKEY_CANCELADA]: "errores.passkeyCancelada",
  [AVISO_PASSKEY_FALLO]: "errores.passkeyFallo",
  [CODIGO_USDC_SIN_XLM]: "errores.cobroSinXlm",
  [AVISO_USDC_SIN_XLM]: "errores.cobroSinXlm",
  [AVISO_USDC_SECUENCIA]: "errores.cobroSecuencia",
  [AVISO_USDC_FIRMANTE]: "errores.cobroFirmante",
  [AVISO_USDC_VENCIDO]: "errores.cobroVencido",
  [AVISO_USDC_PENDIENTE]: "errores.cobroPendiente",
  [AVISO_USDC_OTRA_CUENTA]: "errores.cobroOtraCuenta",
  [AVISO_USDC_LENTO]: "errores.cobroLento",
  "Sign in to continue.": "errores.entrarContinuar",
  [AVISO_GENERICO]: "errores.noEntrar",
  [AVISO_CODIGO_INVALIDO]: "errores.codigoNo",
  [AVISO_CODIGO_VENCIDO]: "errores.codigoVencio",
  [AVISO_RED]: "errores.sinRed",
  [AVISO_GOOGLE_CERRADO]: "errores.googleCerrado",
  [AVISO_GOOGLE_BLOQUEADO]: "errores.googleBloqueado",
  [AVISO_CONFIG]: "errores.sinConfig",
  [AVISO_CORREO]: "errores.correo",
  [AVISO_DEMO]: "errores.demoCorreo",
  [AVISO_SPAM]: "errores.spam",
  [AVISO_SIN_CUENTA]: "errores.sinCuenta",
  [AVISO_SPAM_ENLACE]: "errores.spamEnlace",
  [AVISO_METODO_RECUPERACION]: "errores.metodoRecuperacion",
  [AVISO_SIN_RESPALDO]: "errores.sinRespaldo",
  [AVISO_MONTO_INVALIDO]: "errores.montoInvalido",
  [AVISO_MONTO_TOPE]: "errores.montoTope",
  [AVISO_MONTO_TARDE]: "errores.montoTarde",
  [MOTIVO_COPIA]: "revision.copia",
  "Needs a manual review": "revision.manual",
  "Could not sign in.": "entrar.couldNotSignIn",
  "Could not leave demo mode.": "entrar.leaveDemoFail",
  "Could not show the camera.": "evidencia.noCameraShow",
  "Could not open the camera. Allow the camera and try again.": "evidencia.noCamera",
  "The camera is not ready yet.": "evidencia.cameraNotReady",
  "Could not take the photo.": "evidencia.noPhoto",
  "Choose a PDF, HTML, text, JPEG, PNG, or WebP file.": "evidencia.badFile",
  [texto("en", "evidencia.badFile")]: "evidencia.badFile",
  [texto("en", "evidencia.archivoVacio")]: "evidencia.archivoVacio",
  [texto("en", "evidencia.archivoFalso")]: "evidencia.archivoFalso",
  [texto("en", "evidencia.archivoPequena")]: "evidencia.archivoPequena",
  [texto("en", "evidencia.archivoGrande")]: "evidencia.archivoGrande",
  "Take the photo with the camera.": "evidencia.useCamera",
  "Take the photo now. Photos from the gallery are not accepted.": "evidencia.gallery",
  "Could not send. Try again.": "evidencia.noSend",
  [AVISO_ENVIO_FALLIDO]: "evidencia.sendFailed",
  [AVISO_ENVIO_SIN_CONFIRMAR]: "evidencia.sendUnconfirmed",
  [AVISO_ENVIO_INCIERTO]: "evidencia.sendUnknown",
  "We couldn't find that task.": "evidencia.noTask",
  "Could not load this review.": "revision.noLoad",
  "Could not ask for another photo.": "revision.noAsk",
  "The review could not be retried.": "bandeja.retryFail",
  "We couldn't load your account.": "cuenta.noLoad",
  "Could not load events.": "eventos.noLoad",
  "Could not create the invite.": "eventos.inviteFail",
  "That code is not valid.": "eventos.joinInvalid",
  "Could not assign that task.": "eventos.assignFail",
  "Enter a name and at least one task with an amount.": "eventos.needFields",
  "Could not create the event.": "eventos.createFail",
  "Demo mode cannot create events. Sign in with your email to create one.": "eventos.demoCreate",
  "Could not prepare the account.": "eventos.prepareFail",
  "Account setup isn't available yet.": "errores.cuentasNo",
  "Could not open the demo. Try again.": "entrar.demoOpenFail",
  "Could not save that task.": "eventos.saveFail",
  "Only the organizer can edit tasks.": "eventos.editOnly",
  "This task already has a photo, so it can't be edited.": "eventos.editPhoto",
  "This task already has a payment, so it can't be edited.": "eventos.editPaid",
  "The amount is already locked in the payment, so this task can't be edited.": "eventos.editLocked",
  "Enter a title.": "eventos.needTitle",
  "Title is too long.": "eventos.titleLong",
  "Enter what the photo must show.": "eventos.needPhoto",
  "That note is too long.": "eventos.noteLong",
  "Work tasks don't have a cap.": "eventos.noCap",
  "Choose a person in this event.": "eventos.choosePerson",
  "Nothing to save.": "eventos.nothingSave",
  "That person is not in this event.": "eventos.notInEvent",
  "Could not save priority and difficulty.": "clasificacion.saveFail",
  "Only the organizer can set priority and difficulty.": "clasificacion.onlyOrganizer",
  "Choose Normal or High.": "clasificacion.choosePriority",
  "Choose Easy, Medium, Hard, or Not set.": "clasificacion.chooseDifficulty",
  "Mile already checked the maximum number of attempts.": "mile.topeAviso",
  "Requirements have to be a list.": "mile.requisitosLista",
  "Enter at most 3 requirements.": "mile.requisitosMax",
  "Demo mode cannot suggest requirements.": "mile.demoSugerir",
  "We couldn't open this payout account on the test network. Open Events and tap Get ready to be paid.": "errores.faucetTestnet",
  "Payout accounts are only opened on the test network.": "errores.soloTestnet",
  "We couldn't find that evidence.": "avisos.sinEvidencia",
  "We couldn't find the photo.": "avisos.sinFoto",
  "The task is missing.": "avisos.faltaTarea",
  "You can't view that evidence.": "avisos.noVerEvidencia",
  "Receipts do not use a camera check.": "avisos.reciboSinCamara",
  "Only the person assigned to the task can submit evidence.": "avisos.soloAsignado",
  "Evidence checks are not configured.": "avisos.chequesNo",
  "The photo did not arrive.": "avisos.fotoNoLlego",
  "The task and the photo are missing.": "avisos.faltaTareaYFoto",
  "Only the person assigned to the task can set the payout account.": "avisos.soloCobro",
  "Evidence checks need migration 0005_evidencia_antifraude.sql before new files can be saved.": "avisos.migracion",
  "This file was already submitted.": "avisos.yaEnviado",
  "Could not read the photo.": "avisos.noLeerFoto",
  "Could not save the file.": "avisos.noGuardarArchivo",
  "The body is not JSON.": "avisos.noJson",
  "Only the organizer can assign tasks.": "avisos.soloAsignar",
  "This task has a fixed amount.": "avisos.montoFijo",
  "Submit a receipt before confirming the amount.": "avisos.reciboAntes",
  "The database is not ready.": "avisos.baseNoLista",
  "The database is missing a migration.": "avisos.baseEsquema",
  "The database could not be reached.": "avisos.baseConexion",
  "The database returned an error.": "avisos.baseError",
  "The database is not configured.": "avisos.baseNo",
  "Photo storage is not configured.": "avisos.fotosNo",
  "The event is missing.": "avisos.faltaEvento",
  "We couldn't find that event.": "avisos.sinEvento",
  "There is no project yet.": "avisos.sinProyecto",
  "Enter an event name and at least one task.": "avisos.nombreYTarea",
  "Enter an event name.": "avisos.nombreEvento",
  "Add at least one task with a title and an amount.": "avisos.alMenosUna",
  "That person doesn't have an account yet. Invite them, then assign the task.": "avisos.sinCuentaPersona",
  "Every task needs a title.": "avisos.tituloTarea",
  "Every task needs a type (Work or Reimbursement).": "avisos.tipoTarea",
  "Every task needs an amount greater than zero.": "avisos.montoTarea",
  "Enter a valid email in Assign to.": "avisos.correoAsignar",
  "Only the organizer can invite people.": "avisos.soloInvitar",
  "Too many failed codes. Wait 15 minutes and try again.": "avisos.muchosCodigos",
  "Choose a code or a direct invite.": "avisos.eligeInvitacion",
  "A direct invite needs an email.": "avisos.correoInvitacion",
  "Uses must be a whole number from 1 to 500.": "avisos.usosInvitacion",
  "The email is missing.": "avisos.faltaCorreo",
  "Choose Sign up or Sign in.": "avisos.eligeIngreso",
  "Could not confirm sign-in.": "avisos.noConfirmar",
  "Could not sign out.": "avisos.noSalir",
  "This task can no longer be reviewed.": "avisos.noRevisar",
  "Wait a moment before reviewing again.": "avisos.esperaRevisar",
  "Not found.": "avisos.noEncontrado",
  "Too many demo sign-ins. Wait a moment.": "avisos.muchosDemos",
  "That demo account is not allowed.": "avisos.demoNo",
  "Could not open the demo session.": "avisos.demoNoAbrio",
  "That action is not available.": "avisos.accionNo",
  "The signed transaction is missing.": "avisos.xdrFirmadoFalta",
  "The signed transaction is too long.": "avisos.xdrFirmadoLargo",
  "The body is too large.": "avisos.cuerpoGrande",
  "Only the organizer reviews.": "avisos.soloRevisa",
  "Could not load your tasks.": "avisos.noCargarTareas",
  "Could not load this event.": "avisos.noCargarEvento",
  "The server cannot confirm this payment.": "avisos.servidorNoConfirma",
  "This signature does not match the prepared task.": "avisos.firmaNoCoincide",
  "The payment does not match this task.": "avisos.pagoNoCoincide",
  "The submit succeeded and it could not be saved.": "avisos.noGuardarPago",
  "The database is not configured and the payment was not saved.": "avisos.baseSinPago",
  "We couldn't find that task to save the payment.": "avisos.sinTareaPago",
  "The submit succeeded, but the transaction does not release the milestone, so it was not marked paid.": "avisos.noLibera",
  "The submit does not match this task's escrow, so it was not marked paid.": "avisos.noContratoPago",
  "The submit was not confirmed, so it was not marked paid.": "avisos.noConfirmado",
  "The submit succeeded and there is no hash to save the payment.": "avisos.sinHash",
};

const PATRONES: readonly (readonly [RegExp, Clave])[] = [
  [/HYTO_ESCROW_|three different accounts|platform account cannot|resolver cannot|admin account cannot/i, "errores.servidorIncompleto"],
  [/Trustless Work did not authorize/i, "errores.pagosNoDisponibles"],
  [/already released|already paid/i, "errores.yaPagada"],
  [/trustline|receiver/i, "errores.listoCobro"],
  [/insufficient balance|not enough usdc|balance must be equal/i, "errores.saldoInsuficiente"],
  [/fee-bump|friendbot|not enough xlm|\bxlm\b/i, "errores.saldoRed"],
  [/xdr|escrow|signer|contract id|soroban|stellar/i, "errores.paso"],
];

const CLAVES_CONOCIDAS = [...new Set([...Object.values(EXACTO), ...PATRONES.map((fila) => fila[1])])];
const SALIDA_EN = new Map<string, Clave>();
const SALIDA_ES = new Set<string>();
for (const clave of CLAVES_CONOCIDAS) {
  SALIDA_EN.set(texto("en", clave), clave);
  SALIDA_ES.add(texto("es", clave));
}

const ESPERA = /^Wait (\d+) s before requesting another code$/;
const SALDO_NO_CUBRE = /^Your balance does not cover US\$([\d.]+) \(this amount plus a US\$([\d.]+) reserve\)\.$/;

export function mensajeClaro(mensaje: string, idioma: Idioma = "en"): string {
  const limpio = mensaje.trim();
  if (!limpio) return limpio;
  if (esOrigenCavos(limpio)) return texto(idioma, "errores.origenCavos");
  const espera = ESPERA.exec(limpio);
  if (espera) return texto(idioma, "entrar.espera", { n: espera[1] });
  const saldo = SALDO_NO_CUBRE.exec(limpio);
  if (saldo) return texto(idioma, "errores.saldoNoCubre", { n: saldo[1], reserva: saldo[2] });
  if (idioma === "es" && SALIDA_ES.has(limpio)) return limpio;
  const clave = EXACTO[limpio] ?? SALIDA_EN.get(limpio);
  if (clave) return texto(idioma, clave);
  for (const [patron, destino] of PATRONES) {
    if (patron.test(limpio)) return texto(idioma, destino);
  }
  return limpio;
}

export type PasoFlujo = {
  nombre: string;
  estado: "done" | "now" | "later";
};

export function pasosDePago(
  entrada: {
    tieneVeredicto: boolean;
    revisionFallida: boolean;
    presupuestoListo: boolean;
    pagado: boolean;
  },
  idioma: Idioma = "en",
): PasoFlujo[] {
  const nombres = [
    texto(idioma, "pago.reviewPhoto"),
    texto(idioma, "pago.lockBudget"),
    texto(idioma, "pago.pay"),
  ];
  if (entrada.pagado) {
    return nombres.map((nombre) => ({ nombre, estado: "done" }));
  }
  const revisionLista = entrada.tieneVeredicto || entrada.revisionFallida;
  const revision: PasoFlujo["estado"] = revisionLista ? "done" : "now";
  const bloqueo: PasoFlujo["estado"] = !revisionLista ? "later" : entrada.presupuestoListo ? "done" : "now";
  const pago: PasoFlujo["estado"] = revisionLista && entrada.presupuestoListo ? "now" : "later";
  const estados: PasoFlujo["estado"][] = [revision, bloqueo, pago];
  return nombres.map((nombre, indice) => ({ nombre, estado: estados[indice] }));
}

const PASOS_BLOQUEO = new Set(["desplegar", "fondear"]);
const PASOS_PAGO = new Set(["marcar", "aprobar", "liberar"]);

export type CajaFallo = "bloqueo" | "pago";

export function cajaDeFallo(entrada: { paso: string | null; codigo: string | null }): CajaFallo | null {
  if (entrada.codigo === CODIGO_YA_FONDEADO) return null;
  if (entrada.paso && PASOS_BLOQUEO.has(entrada.paso)) return "bloqueo";
  if (entrada.paso && PASOS_PAGO.has(entrada.paso)) return "pago";
  if (entrada.codigo === CODIGO_RECEPTOR_NO_LISTO || entrada.codigo === CODIGO_HORIZON_RECEPTOR) return "bloqueo";
  return null;
}

export function tituloFallo(caja: CajaFallo, idioma: Idioma = "en"): string {
  return texto(idioma, caja === "bloqueo" ? "pago.budgetNotLocked" : "pago.paymentFailed");
}

export function detalleFallo(caja: CajaFallo, aviso: string, idioma: Idioma = "en"): string {
  // A pay step with no escrow balance uses the generic line. A missing network fee is a different problem.
  if (caja === "pago" && aviso !== texto(idioma, "errores.saldoRed")) return texto(idioma, "pago.noUsdcLeft");
  return aviso;
}

export function frasePaso(accion: "desplegar" | "fondear" | "marcar" | "aprobar" | "liberar", idioma: Idioma = "en"): string {
  if (accion === "desplegar") return texto(idioma, "pago.settingUpLong");
  if (accion === "fondear") return texto(idioma, "pago.lockingLong");
  if (accion === "marcar") return texto(idioma, "pago.recording");
  if (accion === "aprobar") return texto(idioma, "pago.approvingLong");
  return texto(idioma, "pago.sending");
}
