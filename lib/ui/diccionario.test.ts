import assert from "node:assert/strict";
import test from "node:test";
import {
  AVISO_PASSKEY_CANCELADA,
  AVISO_PASSKEY_FALLO,
  AVISO_PASSKEY_SIN_CLAVE,
  AVISO_PASSKEY_SIN_SOPORTE,
} from "@/lib/auth/avisosPasskey";
import { AVISO_DISPOSITIVO, AVISO_PASSKEY, AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { AVISO_HORIZON_RECEPTOR, AVISO_RECEPTOR_NO_LISTO } from "@/lib/escrow/receptorAvisos";
import {
  AVISO_USDC_FIRMANTE,
  AVISO_USDC_LENTO,
  AVISO_USDC_OTRA_CUENTA,
  AVISO_USDC_PENDIENTE,
  AVISO_USDC_SECUENCIA,
  AVISO_USDC_SIN_XLM,
  AVISO_USDC_VENCIDO,
} from "@/lib/integrante/avisosUsdc";
import { en, es, leerTexto, rutas, texto, type FuenteTextos } from "./diccionario";

test("English and Spanish dictionaries have the same keys", () => {
  assert.deepEqual(rutas(en).sort(), rutas(es).sort());
});

test("every dictionary string is non-empty and Spanish falls back to English", () => {
  for (const clave of rutas(en)) {
    assert.ok(leerTexto("en", clave).length > 0, clave);
    assert.ok(leerTexto("es", clave).length > 0, clave);
  }
  const hueco = structuredClone(es);
  hueco.nav.events = "";
  const fuente: FuenteTextos = { en, es: hueco };
  assert.equal(leerTexto("es", "nav.events", fuente), "Events");
  assert.equal(leerTexto("es", "no.existe", fuente), "no.existe");
});

test("verdict labels and the payout notices keep their English wording", () => {
  assert.equal(texto("en", "veredictos.insuficiente"), "Insufficient");
  assert.equal(texto("en", "veredictos.parcial"), "Partially completed");
  assert.equal(texto("en", "veredictos.cumplio"), "Completed");
  assert.equal(texto("es", "veredictos.insuficiente"), "Insuficiente");
  assert.equal(texto("es", "veredictos.parcial"), "Parcialmente completado");
  assert.equal(texto("es", "veredictos.cumplio"), "Completado");
  assert.equal(texto("en", "errores.receptorNoListo"), AVISO_RECEPTOR_NO_LISTO);
  assert.equal(texto("en", "errores.horizonReceptor"), AVISO_HORIZON_RECEPTOR);
  assert.equal(texto("en", "errores.reingreso"), AVISO_REINGRESO);
  assert.equal(texto("en", "errores.dispositivo"), AVISO_DISPOSITIVO);
  assert.equal(texto("en", "errores.passkey"), AVISO_PASSKEY);
  assert.equal(texto("en", "errores.passkeySinSoporte"), AVISO_PASSKEY_SIN_SOPORTE);
  assert.equal(texto("en", "errores.passkeySinClave"), AVISO_PASSKEY_SIN_CLAVE);
  assert.equal(texto("en", "errores.passkeyCancelada"), AVISO_PASSKEY_CANCELADA);
  assert.equal(texto("en", "errores.passkeyFallo"), AVISO_PASSKEY_FALLO);
  assert.equal(texto("en", "errores.cobroSinXlm"), AVISO_USDC_SIN_XLM);
  assert.equal(texto("en", "errores.cobroSecuencia"), AVISO_USDC_SECUENCIA);
  assert.equal(texto("en", "errores.cobroFirmante"), AVISO_USDC_FIRMANTE);
  assert.equal(texto("en", "errores.cobroVencido"), AVISO_USDC_VENCIDO);
  assert.equal(texto("en", "errores.cobroPendiente"), AVISO_USDC_PENDIENTE);
  assert.equal(texto("en", "errores.cobroOtraCuenta"), AVISO_USDC_OTRA_CUENTA);
  assert.equal(texto("en", "errores.cobroLento"), AVISO_USDC_LENTO);
  assert.equal(texto("es", "entrar.espera", { n: 12 }), "Espera 12 s antes de pedir otro código");
  assert.equal(texto("en", "cuenta.pasaporteTitulo"), "Stellar Passport");
  assert.equal(texto("es", "cuenta.pasaporteTitulo"), "Stellar Passport");
  assert.equal(texto("en", "cuenta.pasaporteDetalle"), "It records participation and achievements in the Stellar ecosystem.");
  assert.equal(texto("es", "cuenta.pasaporteDetalle"), "Registra la participación y los logros en el ecosistema Stellar.");
  assert.equal(texto("en", "cuenta.pasaporteAbrir"), "Open Stellar Passport");
  assert.equal(texto("es", "cuenta.pasaporteAbrir"), "Abrir Stellar Passport");
  assert.equal(texto("en", "evidencia.uploaded"), "Photo uploaded successfully");
  assert.equal(texto("es", "evidencia.uploaded"), "Foto subida correctamente");
  assert.equal(texto("en", "evidencia.reachedOrganizer"), "Your photo already reached the organizer");
  assert.equal(texto("es", "evidencia.reachedOrganizer"), "Tu foto ya le llegó al organizador");
  assert.equal(texto("en", "evidencia.mileCouldntFinish"), "Mile couldn't finish — retry");
  assert.equal(texto("es", "evidencia.mileCouldntFinish"), "Mile no pudo terminar — reintenta");
  assert.equal(texto("en", "evidencia.mileRetry"), "The review did not finish. Send the photo again.");
  assert.equal(texto("es", "evidencia.mileRetry"), "La revisión no terminó. Envía la foto otra vez.");
  assert.equal(texto("en", "evidencia.notEnoughName", { name: "Ana" }), "Ana, this photo didn't pass Mile's check");
  assert.equal(texto("es", "evidencia.notEnoughName", { name: "Ana" }), "Ana, esta foto no pasó la revisión de Mile");
});

const VOSEO =
  /\b(agregá|tenés|podés|querés|sabés|sos|debés|hacés|ganás|confirmá|revisá|mirá|andá|tocá|usá|guardá|elegí|probá|entrá|abrí|poné|decí|pasá|seguí|volvé|cambiá|creá|firmá|pagá|cobrá|subí|bajá|mandá|sacá|dejá|llevá|traé|mostrá|esperá|cancelá|compartí|escaneá|iniciá|fijate|decime|hacé)\b/i;

test("el español usa tú y llave de acceso, y el ingreso no mezcla jerga", () => {
  for (const clave of rutas(es)) {
    const valor = leerTexto("es", clave);
    assert.doesNotMatch(valor, /\bpasskey\b/i, clave);
    assert.doesNotMatch(valor, /Use a phone or tablet|Create passkey|Use passkey/i, clave);
    assert.doesNotMatch(valor, VOSEO, clave);
  }
  assert.equal(texto("es", "entrar.titleSignUp"), "Crea tu cuenta en Hyto");
  assert.equal(texto("es", "entrar.createAccount"), "Crear cuenta");
  assert.equal(texto("en", "entrar.titleSignUp"), "Create your Hyto account");
  assert.equal(texto("en", "entrar.createAccount"), "Create account");
  assert.equal(texto("en", "entrar.dialogSignUp"), "Create account");
  assert.equal(texto("en", "entrar.mile.code"), "Your code is here.");
  assert.equal(texto("es", "entrar.mile.code"), "Tu código ya está aquí.");
  assert.equal(texto("en", "entrar.legal"), "You sign in with your email. That opens the account you already have.");
  assert.equal(texto("en", "entrar.legalSignUp"), "You sign in with your email. We create your Hyto account so you can get paid.");
  assert.equal(texto("es", "entrar.legalSignUp"), "Entras con tu correo. Creamos tu cuenta de Hyto para que puedas cobrar.");
  assert.doesNotMatch(texto("en", "entrar.legalSignUp"), /hold your payment|Sign-in by Cavos|wallet/i);
  assert.doesNotMatch(texto("es", "entrar.legalSignUp"), /guardar tu pago|Cavos|billetera/i);
  assert.match(texto("es", "cuenta.passkeyTelefono"), /Usar un teléfono o una tablet/);
  assert.match(texto("es", "guiaPasskey.paso3"), /Usar un teléfono o una tablet/);
  assert.equal(texto("en", "tareas.paidNote", { amount: "US$12.44" }), "Paid · US$12.44");
  assert.equal(texto("es", "tareas.paidNote", { amount: "US$12.44" }), "Pagada · US$12.44");
  assert.doesNotMatch(texto("en", "tareas.paidNote", { amount: "US$12" }), /wallet|USDC/i);
  assert.doesNotMatch(texto("es", "tareas.paidNote", { amount: "US$12" }), /billetera|USDC/i);
});
