import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_DISPOSITIVO, AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
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
  assert.equal(texto("en", "cuenta.pasaporteAbrir"), "Open on testnet");
  assert.equal(texto("es", "cuenta.pasaporteAbrir"), "Abrir en testnet");
  assert.equal(texto("en", "evidencia.uploaded"), "Photo uploaded successfully");
  assert.equal(texto("es", "evidencia.uploaded"), "Foto subida correctamente");
  assert.equal(texto("en", "evidencia.reachedOrganizer"), "Your photo already reached the organizer");
  assert.equal(texto("es", "evidencia.reachedOrganizer"), "Tu foto ya le llegó al organizador");
});
