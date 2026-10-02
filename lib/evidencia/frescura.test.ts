import assert from "node:assert/strict";
import test from "node:test";
import { TOLERANCIA_FRESCURA_MS, evaluarFrescura, fechaExif } from "./frescura";
import { jpegDePrueba } from "./muestras";

const AHORA = Date.parse("2026-10-02T12:00:00.000Z");

test("una captura de la cámara dentro de la tolerancia queda fresca", () => {
  const fresco = evaluarFrescura({
    capturadaEn: new Date(AHORA - 60_000).toISOString(),
    emitidoEn: AHORA - 5_000,
    ahora: AHORA,
    exif: null,
  });
  assert.equal(fresco.ok, true);
  if (fresco.ok) assert.equal(fresco.frescura, "captura");
});

test("una captura vieja o sin hora no pasa", () => {
  const vieja = evaluarFrescura({
    capturadaEn: new Date(AHORA - TOLERANCIA_FRESCURA_MS - 1_000).toISOString(),
    emitidoEn: AHORA,
    ahora: AHORA,
    exif: null,
  });
  assert.equal(vieja.ok, false);
  if (!vieja.ok) assert.match(vieja.aviso, /not a fresh camera capture/);

  const sinHora = evaluarFrescura({ capturadaEn: null, emitidoEn: AHORA, ahora: AHORA, exif: null });
  assert.equal(sinHora.ok, false);
  if (!sinHora.ok) assert.match(sinHora.aviso, /capture time is missing/);
});

test("un EXIF viejo gana aunque el cliente diga que acaba de tomarla", () => {
  const fresco = evaluarFrescura({
    capturadaEn: new Date(AHORA).toISOString(),
    emitidoEn: AHORA,
    ahora: AHORA,
    exif: new Date(AHORA - 60 * 60 * 1000),
  });
  assert.equal(fresco.ok, false);
});

test("un JPEG de la cámara no trae DateTimeOriginal", async () => {
  assert.equal(await fechaExif(await jpegDePrueba()), null);
});
