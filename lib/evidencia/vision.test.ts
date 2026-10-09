import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { jpegDePrueba, PDF_MINIMO } from "./muestras";
import { ajustarParaVision, tamanoBase64 } from "./vision";

/** 40 x 20 pixels, red on the left and blue on the right, stored with an EXIF Orientation tag. */
async function fotoGirada(orientacion: number): Promise<Uint8Array> {
  const datos = Buffer.alloc(40 * 20 * 3);
  for (let y = 0; y < 20; y += 1) {
    for (let x = 0; x < 40; x += 1) {
      const i = (y * 40 + x) * 3;
      datos[i] = x < 20 ? 255 : 0;
      datos[i + 2] = x < 20 ? 0 : 255;
    }
  }
  const salida = await sharp(datos, { raw: { width: 40, height: 20, channels: 3 } })
    .jpeg({ quality: 95 })
    .withMetadata({ orientation: orientacion })
    .toBuffer();
  return new Uint8Array(salida);
}

async function pixel(bytes: Uint8Array, x: number, y: number): Promise<{ r: number; b: number }> {
  const { data, info } = await sharp(Buffer.from(bytes)).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return { r: data[i] ?? 0, b: data[i + 2] ?? 0 };
}

test("una foto de teléfono guardada de lado llega derecha al modelo", async () => {
  const girada = await fotoGirada(6);
  assert.equal((await sharp(Buffer.from(girada)).metadata()).orientation, 6);

  const ajustada = await ajustarParaVision(girada, "image/jpeg");
  const datos = await sharp(Buffer.from(ajustada.bytes)).metadata();
  assert.equal(ajustada.tipo, "image/jpeg");
  assert.equal(datos.width, 20);
  assert.equal(datos.height, 40);
  assert.equal(datos.orientation === undefined || datos.orientation === 1, true);
  const arriba = await pixel(ajustada.bytes, 10, 5);
  const abajo = await pixel(ajustada.bytes, 10, 34);
  assert.equal(arriba.r > 200 && arriba.b < 60, true);
  assert.equal(abajo.b > 200 && abajo.r < 60, true);
});

test("una foto derecha que cabe se envía tal cual", async () => {
  const derecha = await jpegDePrueba();
  const ajustada = await ajustarParaVision(derecha, "image/jpeg");
  assert.equal(ajustada.bytes, derecha);
  assert.equal(ajustada.tipo, "image/jpeg");

  const sinGiro = await fotoGirada(1);
  const limpia = await ajustarParaVision(sinGiro, "image/jpeg");
  const datos = await sharp(Buffer.from(limpia.bytes)).metadata();
  assert.equal(datos.width, 40);
  assert.equal(datos.height, 20);
  assert.equal(datos.exif, undefined);
  assert.equal(datos.orientation === undefined || datos.orientation === 1, true);
});

test("lo que sharp no puede leer y los PDF pasan sin tocar", async () => {
  const raro = new Uint8Array([1, 2, 3]);
  assert.deepEqual(await ajustarParaVision(raro, "image/jpeg"), { bytes: raro, tipo: "image/jpeg" });
  assert.deepEqual(await ajustarParaVision(PDF_MINIMO, "application/pdf"), { bytes: PDF_MINIMO, tipo: "application/pdf" });
});

test("una foto girada que no cabe se achica y también queda derecha", async () => {
  const girada = await fotoGirada(6);
  const tope = tamanoBase64(girada.byteLength) - 4;
  const ajustada = await ajustarParaVision(girada, "image/jpeg", tope);
  const datos = await sharp(Buffer.from(ajustada.bytes)).metadata();
  assert.equal(tamanoBase64(ajustada.bytes.byteLength) <= tope, true);
  assert.equal(datos.width, 20);
  assert.equal(datos.height, 40);
});
