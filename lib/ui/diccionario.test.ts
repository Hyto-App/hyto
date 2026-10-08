import assert from "node:assert/strict";
import test from "node:test";
import {
  AVISO_PASSKEY_CANCELADA,
  AVISO_PASSKEY_FALLO,
  AVISO_PASSKEY_SIN_CLAVE,
  AVISO_PASSKEY_SIN_SOPORTE,
} from "@/lib/auth/avisosPasskey";
import { AVISO_ORIGEN_CAVOS } from "@/lib/auth/errores";
import { AVISO_DISPOSITIVO, AVISO_PASSKEY, AVISO_REINGRESO, AVISO_SIN_CUENTA_FIRMA } from "@/lib/escrow/firmarCliente";
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
  assert.equal(texto("en", "errores.origenCavos"), AVISO_ORIGEN_CAVOS);
  assert.equal(texto("en", "errores.sinCuentaFirma"), AVISO_SIN_CUENTA_FIRMA);
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
  assert.equal(
    texto("en", "cuenta.passkeyDetalle"),
    "Your sign-in is saved only on this device. Add a passkey so you don't lose your account.",
  );
  assert.equal(
    texto("es", "cuenta.passkeyDetalle"),
    "Tu acceso está guardado solo en este dispositivo. Agregá una passkey para no perder tu cuenta.",
  );
  assert.equal(texto("en", "cuenta.saldoHyto"), "Your Hyto balance");
  assert.equal(texto("es", "cuenta.saldoHyto"), "Tu saldo en Hyto");
  assert.equal(texto("en", "cuenta.cobroTitulo"), "How you get your money");
  assert.equal(texto("es", "cuenta.cobroTitulo"), "Cómo recibir tu dinero");
  assert.equal(texto("en", "revision.technical"), "Advanced");
  assert.equal(texto("es", "revision.technical"), "Avanzado");
  assert.equal(texto("en", "revision.refPendiente"), "The payment reference appears when you set the money aside.");
  assert.equal(texto("es", "revision.refPendiente"), "La referencia del pago aparece cuando apartes el dinero.");
  assert.equal(texto("en", "cuenta.ausente"), "This account cannot receive a payment yet.");
  assert.equal(texto("es", "cuenta.ausente"), "Esta cuenta todavía no puede recibir un pago.");
  assert.equal(texto("en", "revision.yourAccount", { direccion: "G…AAAA" }), "Payment account ID (for support): G…AAAA");
  assert.equal(texto("es", "revision.yourAccount", { direccion: "G…AAAA" }), "ID de tu cuenta de pagos (para soporte): G…AAAA");
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
