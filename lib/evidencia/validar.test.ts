import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { PDF_MINIMO, jpegDePrueba } from "./muestras";
import { MAX_BYTES_ARCHIVO, MIN_LADO_PX, avisoArchivo, evaluarArchivo, validarBytes } from "./validar";

async function imagen(formato: "jpeg" | "png" | "webp", ancho: number, alto: number): Promise<Uint8Array> {
  const creado = sharp({
    create: { width: ancho, height: alto, channels: 3, background: { r: 20, g: 40, b: 60 } },
  });
  const buffer =
    formato === "jpeg" ? await creado.jpeg().toBuffer() : formato === "png" ? await creado.png().toBuffer() : await creado.webp().toBuffer();
  return new Uint8Array(buffer);
}

test("un archivo vacío, un texto renombrado y una imagen de 1×1 no pasan; un PDF y un JPEG real sí", async () => {
  const vacio = validarBytes(new Uint8Array());
  assert.equal(vacio.ok, false);
  if (!vacio.ok) assert.equal(vacio.motivo, "vacio");

  const falso = validarBytes(new TextEncoder().encode("this is not a photo\n"));
  assert.equal(falso.ok, false);
  if (!falso.ok) assert.equal(falso.motivo, "falso");

  const disfraz = validarBytes(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]));
  assert.equal(disfraz.ok, false);
  if (!disfraz.ok) assert.equal(disfraz.motivo, "falso");

  for (const formato of ["jpeg", "png", "webp"] as const) {
    const pequena = validarBytes(await imagen(formato, 1, 1));
    assert.equal(pequena.ok, false, formato);
    if (!pequena.ok) assert.equal(pequena.motivo, "pequena");
  }

  const jpeg = validarBytes(await jpegDePrueba());
  assert.equal(jpeg.ok, true);
  if (jpeg.ok) {
    assert.equal(jpeg.tipo, "image/jpeg");
    assert.equal(jpeg.ancho! >= MIN_LADO_PX && jpeg.alto! >= MIN_LADO_PX, true);
  }

  const pdf = validarBytes(PDF_MINIMO);
  assert.equal(pdf.ok, true);
  if (pdf.ok) assert.equal(pdf.tipo, "application/pdf");

  const nota = validarBytes(new TextEncoder().encode("Team meal receipt\n"), { tipo: "text/plain", nombre: "nota.txt" });
  assert.equal(nota.ok, true);
  if (nota.ok) assert.equal(nota.tipo, "text/plain");

  const html = validarBytes(new TextEncoder().encode("<p>Receipt</p>"), { tipo: "text/html", nombre: "nota.html" });
  assert.equal(html.ok, true);
  if (html.ok) assert.equal(html.tipo, "text/html");

  const markdown = validarBytes(new TextEncoder().encode("# Receipt\n"), { tipo: "", nombre: "nota.md" });
  assert.equal(markdown.ok, true);
  if (markdown.ok) assert.equal(markdown.tipo, "text/markdown");

  const binario = validarBytes(Uint8Array.from([0, 1, 2, 3]), { tipo: "text/plain", nombre: "nota.txt" });
  assert.equal(binario.ok, false);
  if (!binario.ok) assert.equal(binario.motivo, "falso");

  assert.match(avisoArchivo("vacio"), /1\.\s/);
  assert.match(avisoArchivo("falso"), /Renaming a text file/);
  assert.match(avisoArchivo("pequena"), /1×1/);
  assert.match(avisoArchivo("grande"), /10 MB/);
});

test("más de 10 MB se rechaza antes de leer los bytes", async () => {
  let leido = false;
  const resultado = await evaluarArchivo({
    size: MAX_BYTES_ARCHIVO + 1,
    arrayBuffer: async () => {
      leido = true;
      return new ArrayBuffer(0);
    },
  });
  assert.equal(resultado.ok, false);
  if (!resultado.ok) assert.equal(resultado.motivo, "grande");
  assert.equal(leido, false);
});
