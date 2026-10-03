import assert from "node:assert/strict";
import test from "node:test";
import { AVISO_REINGRESO } from "@/lib/escrow/firmarCliente";
import { AVISO_HORIZON_RECEPTOR, AVISO_RECEPTOR_NO_LISTO } from "@/lib/escrow/receptorAvisos";
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
  assert.equal(texto("es", "entrar.espera", { n: 12 }), "Espera 12 s antes de pedir otro código");
});
