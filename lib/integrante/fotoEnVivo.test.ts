import assert from "node:assert/strict";
import test from "node:test";
import { TOLERANCIA_FRESCURA_MS } from "../evidencia/frescura";
import { EDAD_MAXIMA_MS, archivoDeCamaraReciente, esFotoDeCamara } from "./fotoEnVivo";

const AHORA = Date.parse("2026-10-01T12:00:00.000Z");

function archivo(tipo: string, lastModified: number, bytes = 3): File {
  return new File([Uint8Array.from({ length: bytes }, (_, i) => i + 1)], "foto.jpg", { type: tipo, lastModified });
}

test("la ventana del navegador es la misma que la del servidor", () => {
  assert.equal(EDAD_MAXIMA_MS, TOLERANCIA_FRESCURA_MS);
});

test("solo un jpeg con bytes cuenta como foto de cámara", () => {
  assert.equal(esFotoDeCamara(archivo("image/jpeg", AHORA)), true);
  assert.equal(esFotoDeCamara(archivo("IMAGE/JPEG; charset=binary", AHORA)), true);
  assert.equal(esFotoDeCamara(archivo("", AHORA)), true);
  assert.equal(esFotoDeCamara(archivo("image/png", AHORA)), false);
  assert.equal(esFotoDeCamara(archivo("image/svg+xml", AHORA)), false);
  assert.equal(esFotoDeCamara(archivo("image/gif", AHORA)), false);
  assert.equal(esFotoDeCamara(archivo("image/jpeg", AHORA, 0)), false);
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
