import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { pdfConTexto, pdfEscaneado, PDF_MINIMO } from "./muestras";
import { imagenDePdf, textoInsuficiente } from "./pdf-imagen";

test("un PDF escaneado (solo imagen, sin texto) se vuelve un JPEG para la visión", async () => {
  const imagen = await imagenDePdf(await pdfEscaneado(400, 520));
  assert.ok(imagen);
  assert.equal(imagen.tipo, "image/jpeg");
  const meta = await sharp(Buffer.from(imagen.bytes)).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 400);
  assert.equal(meta.height, 520);
});

test("un PDF con texto y sin imágenes no da imagen, y uno roto tampoco", async () => {
  assert.equal(await imagenDePdf(pdfConTexto("Factura 123 total 4500")), null);
  assert.equal(await imagenDePdf(PDF_MINIMO), null);
  assert.equal(await imagenDePdf(new TextEncoder().encode("%PDF-1.4")), null);
});

test("pocas letras cuentan como sin texto: así se detecta un escaneo", () => {
  assert.equal(textoInsuficiente(""), true);
  assert.equal(textoInsuficiente("  1 / 1  "), true);
  assert.equal(textoInsuficiente("Factura electrónica 00123, total ₡4.500, Soda La Esquina, 06/10/2026"), false);
});
