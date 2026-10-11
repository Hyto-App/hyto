import assert from "node:assert/strict";
import test from "node:test";
import exifr from "exifr";
import sharp from "sharp";
import { crearFotosMemoria } from "@/lib/blob/fotos";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import { publicarEvidenciaHttp, leerFotoHttp } from "@/lib/api/evidencias";
import { jpegDePrueba } from "./muestras";
import { convieneQuitar, sinMetadatos } from "./metadatos";
import { ajustarParaVision } from "./vision";

async function jpegConNotas(): Promise<Uint8Array> {
  const plano = await sharp({
    create: { width: 32, height: 24, channels: 3, background: { r: 180, g: 40, b: 40 } },
  })
    .jpeg()
    .toBuffer();
  const conNotas = await sharp(plano)
    .withMetadata({
      exif: {
        IFD0: { ImageDescription: "hyto-prueba" },
        IFD3: {
          GPSLatitudeRef: "N",
          GPSLatitude: "9/1 56/1 0/1",
          GPSLongitudeRef: "W",
          GPSLongitude: "84/1 4/1 0/1",
        },
      },
    })
    .jpeg()
    .toBuffer();
  const copia = new Uint8Array(conNotas.byteLength);
  copia.set(conNotas);
  return copia;
}

test("un jpeg sin notas de cámara no se reescribe", async () => {
  const limpio = await jpegDePrueba();
  assert.equal(await convieneQuitar(limpio), false);
  const salida = await sinMetadatos(limpio, "image/jpeg");
  assert.equal(salida.bytes, limpio);
  assert.equal(salida.tipo, "image/jpeg");
  const vision = await ajustarParaVision(limpio, "image/jpeg");
  assert.equal(vision.bytes, limpio);
});

test("la ubicación y las otras notas no se guardan ni se envían a Mile", async () => {
  const original = await jpegConNotas();
  assert.equal(await convieneQuitar(original), true);
  const gps = (await exifr.gps(original)) as { latitude?: number } | undefined;
  assert.equal(typeof gps?.latitude, "number");

  const salida = await sinMetadatos(original, "image/jpeg");
  assert.notEqual(salida.bytes, original);
  assert.equal(await exifr.gps(salida.bytes), undefined);
  assert.equal(await convieneQuitar(salida.bytes), false);
  const campos = (await exifr.parse(salida.bytes)) as Record<string, unknown> | undefined;
  assert.equal(campos, undefined);

  const vision = await ajustarParaVision(original, "image/jpeg");
  assert.equal(await exifr.gps(vision.bytes), undefined);
});

test("un pdf y un archivo que no es imagen quedan igual", async () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const igual = await sinMetadatos(pdf, "application/pdf");
  assert.equal(igual.bytes, pdf);
});

test("la foto que se guarda y la que se muestra ya no traen la ubicación", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const fotos = crearFotosMemoria();
  const original = await jpegConNotas();
  const cuerpo = new FormData();
  cuerpo.set("tareaId", "comida");
  cuerpo.set("foto", new Blob([Uint8Array.from(original)], { type: "image/jpeg" }), "recibo.jpg");
  const creada = await publicarEvidenciaHttp(new Request("http://local/api/evidencias", { method: "POST", body: cuerpo }), {
    almacen,
    fotos,
  });
  assert.equal(creada.status, 201);
  const json = (await creada.json()) as { evidencia: { id: string } };
  const fila = await almacen.leerEvidencia(json.evidencia.id);
  assert.ok(fila);
  const guardada = await fotos.leer(fila.blobId);
  assert.ok(guardada);
  assert.equal(await exifr.gps(guardada.bytes), undefined);

  const foto = await leerFotoHttp(almacen, fotos, json.evidencia.id, { usuarioId: "voluntario-1", demo: false });
  assert.equal(foto.status, 200);
  assert.equal(await exifr.gps(new Uint8Array(await foto.arrayBuffer())), undefined);
});
