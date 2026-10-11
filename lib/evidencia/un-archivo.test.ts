import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { CSP_DOCUMENTO, leerFotoHttp, publicarEvidenciaHttp } from "@/lib/api/evidencias";
import { crearFotosMemoria } from "@/lib/blob/fotos";
import { crearMemoria } from "@/lib/db/memoria";
import { asegurarSemilla } from "@/lib/db/semilla";
import { ORIGEN_ARCHIVO } from "@/lib/integrante/fotoEnVivo";
import { desdeGuion } from "@/lib/revision/armar";
import { MAX_BYTES_ARCHIVO } from "./validar";
import { PDF_MINIMO, jpegDePrueba } from "./muestras";
import { reiniciarTokensEvidencia } from "./token";

const actor = { usuarioId: "voluntario-1", rol: "voluntario" as const };
const visor = { usuarioId: "voluntario-1", demo: false };

function cumplio() {
  return { ...desdeGuion("trabajo", null), veredicto: "cumplió" as const, origen: "scout" as const, score: "cumplió" };
}

function pedido(cuerpo: FormData): Request {
  return new Request("http://local/api/evidencias", { method: "POST", body: cuerpo });
}

function archivo(bytes: Uint8Array | string, tipo: string, nombre: string, origen: string | null = ORIGEN_ARCHIVO, tareaId = "stand") {
  const cuerpo = new FormData();
  cuerpo.set("tareaId", tareaId);
  if (origen) cuerpo.set("origen", origen);
  const parte = typeof bytes === "string" ? bytes : new Uint8Array(bytes);
  cuerpo.set("foto", new Blob([parte], { type: tipo }), nombre);
  return pedido(cuerpo);
}

async function png(r: number): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width: 40, height: 30, channels: 3, background: { r, g: 40, b: 90 } } }).png().toBuffer());
}

async function preparar() {
  reiniciarTokensEvidencia();
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  const fotos = crearFotosMemoria();
  return { almacen, fotos, actor, revisarTarea: async () => cumplio() };
}

async function aviso(respuesta: Response): Promise<string> {
  return ((await respuesta.json()) as { aviso: string }).aviso;
}

test("un trabajo fuera del demo acepta un archivo elegido: PNG de galería, PDF, lista .txt, recibo HTML y JPEG sin token", async () => {
  const deps = await preparar();

  const galeria = await publicarEvidenciaHttp(archivo(await png(200), "image/png", "galeria.png"), deps);
  assert.equal(galeria.status, 201);
  let fila = await deps.almacen.ultimaEvidencia("stand");
  assert.equal(fila?.tipoArchivo, "image/png");
  assert.equal(fila?.capturadaEn ?? null, null);
  assert.equal(fila?.frescura ?? null, null);
  // A photo from «Upload file» still gets a perceptual hash for near-duplicate checks.
  assert.equal(typeof fila?.phash, "string");
  assert.ok((fila?.phash ?? "").length > 0);

  assert.equal((await publicarEvidenciaHttp(archivo(PDF_MINIMO, "application/pdf", "factura.pdf"), deps)).status, 201);
  fila = await deps.almacen.ultimaEvidencia("stand");
  assert.equal(fila?.tipoArchivo, "application/pdf");
  assert.equal(fila?.phash ?? null, null);

  assert.equal((await publicarEvidenciaHttp(archivo("- Banner\n- Mesa\n- Sillas\n", "text/plain", "lista.txt"), deps)).status, 201);
  assert.equal((await deps.almacen.ultimaEvidencia("stand"))?.tipoArchivo, "text/plain");

  assert.equal((await publicarEvidenciaHttp(archivo("<p>Recibo ₡7.950,00</p>", "text/html", "recibo.html"), deps)).status, 201);
  assert.equal((await deps.almacen.ultimaEvidencia("stand"))?.tipoArchivo, "text/html");

  const jpeg = await publicarEvidenciaHttp(archivo(await jpegDePrueba(), "image/jpeg", "vieja.jpg"), deps);
  assert.equal(jpeg.status, 201);
  fila = await deps.almacen.ultimaEvidencia("stand");
  assert.equal(fila?.tipoArchivo, "image/jpeg");
  assert.equal(fila?.frescura ?? null, null);
  assert.equal(typeof fila?.phash, "string");
});

test("el origen viejo «galeria» sigue entrando como archivo fuera del demo", async () => {
  const deps = await preparar();
  assert.equal((await publicarEvidenciaHttp(archivo(await png(10), "image/png", "vieja.png", "galeria"), deps)).status, 201);
  assert.equal((await deps.almacen.ultimaEvidencia("stand"))?.tipoArchivo, "image/png");
});

test("sin origen, un trabajo sigue en el camino de cámara: JPEG, token y frescura", async () => {
  const deps = await preparar();
  const sinToken = await publicarEvidenciaHttp(archivo(await jpegDePrueba(), "image/jpeg", "foto.jpg", null), deps);
  assert.equal(sinToken.status, 400);
  assert.equal(await aviso(sinToken), "Take the photo with the camera.");
  const pngSinOrigen = await publicarEvidenciaHttp(archivo(await png(30), "image/png", "foto.png", null), deps);
  assert.equal(pngSinOrigen.status, 400);
  assert.equal(await aviso(pngSinOrigen), "Take the photo with the camera.");
  assert.equal((await deps.almacen.ultimaEvidencia("stand"))?.id, "ejemplo-stand");
});

test("un archivo elegido rechaza ejecutables, ZIP, un .exe declarado como JPEG, SVG y GIF", async () => {
  const deps = await preparar();
  const mz = new Uint8Array(64);
  mz.set([0x4d, 0x5a, 0x90, 0x00, 0x03]);
  const elf = new Uint8Array(64);
  elf.set([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01]);
  const zip = new Uint8Array(64);
  zip.set([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
  const gif = new Uint8Array(64);
  gif.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x10, 0x00, 0x10, 0x00]);
  const casos: Array<[Uint8Array | string, string, string]> = [
    [mz, "application/x-msdownload", "programa.exe"],
    [elf, "application/octet-stream", "programa"],
    [zip, "application/zip", "fotos.zip"],
    [mz, "image/jpeg", "foto.jpg"],
    [elf, "image/jpeg", "foto.jpg"],
    [zip, "text/plain", "lista.txt"],
    ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "image/svg+xml", "foto.svg"],
    [gif, "image/gif", "foto.gif"],
  ];
  for (const [bytes, tipo, nombre] of casos) {
    const respuesta = await publicarEvidenciaHttp(archivo(bytes, tipo, nombre), deps);
    assert.equal(respuesta.status, 400, `${nombre} (${tipo})`);
    assert.doesNotMatch(await aviso(respuesta), /camera/i, nombre);
  }
  assert.equal((await deps.almacen.ultimaEvidencia("stand"))?.id, "ejemplo-stand");
});

test("un archivo elegido de más de 10 MB es 413 y el mismo archivo dos veces es 409", async () => {
  const deps = await preparar();
  const enorme = new Uint8Array(MAX_BYTES_ARCHIVO + 1);
  enorme.set([0xff, 0xd8, 0xff]);
  assert.equal((await publicarEvidenciaHttp(archivo(enorme, "image/jpeg", "enorme.jpg"), deps)).status, 413);

  const bytes = await png(120);
  assert.equal((await publicarEvidenciaHttp(archivo(bytes, "image/png", "una.png"), deps)).status, 201);
  const otraVez = await publicarEvidenciaHttp(archivo(bytes, "image/png", "una.png"), deps);
  assert.equal(otraVez.status, 409);
  assert.equal(await aviso(otraVez), "This file was already submitted.");
  const enOtraTarea = await publicarEvidenciaHttp(archivo(bytes, "image/png", "una.png", ORIGEN_ARCHIVO, "registro"), {
    ...deps,
    actor: { usuarioId: "voluntario-2", rol: "voluntario" as const },
  });
  assert.equal(enOtraTarea.status, 409);
});

test("un archivo elegido sigue exigiendo ser quien tiene la tarea asignada", async () => {
  const deps = await preparar();
  const ajeno = await publicarEvidenciaHttp(archivo(await png(77), "image/png", "ajena.png"), {
    ...deps,
    actor: { usuarioId: "voluntario-2", rol: "voluntario" as const },
  });
  assert.equal(ajeno.status, 403);
});

test("un recibo HTML con <script> se sirve como text/plain, nosniff y con CSP de sandbox; imagen y PDF no cambian", async () => {
  const deps = await preparar();
  const html = '<html><body><script>alert("x")</script><p>Total ₡7.950,00</p></body></html>';
  assert.equal((await publicarEvidenciaHttp(archivo(html, "text/html", "recibo.html"), deps)).status, 201);
  const filaHtml = await deps.almacen.ultimaEvidencia("stand");
  assert.equal(filaHtml?.tipoArchivo, "text/html");
  const servida = await leerFotoHttp(deps.almacen, deps.fotos, filaHtml?.id ?? "", visor);
  assert.equal(servida.status, 200);
  assert.equal(servida.headers.get("content-type"), "text/plain");
  assert.equal(servida.headers.get("x-content-type-options"), "nosniff");
  assert.equal(servida.headers.get("content-security-policy"), CSP_DOCUMENTO);
  assert.match(CSP_DOCUMENTO, /default-src 'none'/);
  assert.match(CSP_DOCUMENTO, /sandbox/);
  assert.match(servida.headers.get("content-disposition") ?? "", /evidencia\.txt/);
  assert.match(await servida.text(), /<script>/);

  assert.equal((await publicarEvidenciaHttp(archivo(PDF_MINIMO, "application/pdf", "factura.pdf"), deps)).status, 201);
  const pdf = await leerFotoHttp(deps.almacen, deps.fotos, (await deps.almacen.ultimaEvidencia("stand"))?.id ?? "", visor);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.equal(pdf.headers.get("content-security-policy"), null);
  assert.equal(pdf.headers.get("x-content-type-options"), "nosniff");

  assert.equal((await publicarEvidenciaHttp(archivo(await png(250), "image/png", "foto.png"), deps)).status, 201);
  const imagen = await leerFotoHttp(deps.almacen, deps.fotos, (await deps.almacen.ultimaEvidencia("stand"))?.id ?? "", visor);
  assert.equal(imagen.headers.get("content-type"), "image/png");
  assert.equal(imagen.headers.get("content-security-policy"), null);
  assert.equal(imagen.headers.get("content-disposition"), "inline");
});
