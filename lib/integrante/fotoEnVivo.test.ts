import assert from "node:assert/strict";
import test from "node:test";
import { EDAD_MAXIMA_MS, archivoDeCamaraReciente, esTipoFoto, fotoAceptada } from "./fotoEnVivo";

const AHORA = Date.parse("2026-10-01T12:00:00.000Z");

function archivo(tipo: string, lastModified: number, bytes = 3): File {
  return new File([Uint8Array.from({ length: bytes }, (_, i) => i + 1)], "foto.jpg", { type: tipo, lastModified });
}

test("los tipos de foto de cámara pasan y un svg no", () => {
  assert.equal(esTipoFoto("image/jpeg"), true);
  assert.equal(esTipoFoto("IMAGE/PNG; charset=binary"), true);
  assert.equal(esTipoFoto("image/heic"), true);
  assert.equal(esTipoFoto("image/svg+xml"), false);
  assert.equal(esTipoFoto("image/gif"), false);
  assert.equal(esTipoFoto("text/plain"), false);
  assert.equal(fotoAceptada("", 4), true);
  assert.equal(fotoAceptada("image/jpeg", 0), false);
  assert.equal(fotoAceptada("image/svg+xml", 20), false);
});

test("un archivo reciente de cámara se acepta y uno de galería no", () => {
  assert.equal(archivoDeCamaraReciente(archivo("image/jpeg", AHORA), AHORA), true);
  assert.equal(archivoDeCamaraReciente(archivo("image/jpeg", AHORA - EDAD_MAXIMA_MS), AHORA), true);
  assert.equal(archivoDeCamaraReciente(archivo("image/jpeg", AHORA - EDAD_MAXIMA_MS - 1), AHORA), false);
  assert.equal(archivoDeCamaraReciente(archivo("image/jpeg", AHORA - 60 * 60 * 1000), AHORA), false);
  assert.equal(archivoDeCamaraReciente(archivo("image/jpeg", AHORA + 30_000), AHORA), true);
  assert.equal(archivoDeCamaraReciente(archivo("image/jpeg", AHORA + 120_000), AHORA), false);
  assert.equal(archivoDeCamaraReciente(archivo("image/svg+xml", AHORA), AHORA), false);
  assert.equal(archivoDeCamaraReciente(archivo("", AHORA), AHORA), true);
  assert.equal(archivoDeCamaraReciente(archivo("image/jpeg", AHORA, 0), AHORA), false);
});
