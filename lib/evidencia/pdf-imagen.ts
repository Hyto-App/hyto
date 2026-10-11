import { getDocumentProxy } from "unpdf";
import sharp from "sharp";

/** Pages turned into one image for the vision path. A scanned invoice or list rarely needs more. */
export const MAX_PAGINAS_ESCANEO = 3;
/** Width of the stacked image sent to vision. ajustarParaVision still caps the base64 size. */
const ANCHO_ESCANEO = 1600;
/** A page image smaller than this is a logo or an icon, not a scan. */
const LADO_MINIMO_PX = 200;
/** Letters or digits under this count mean the PDF has no real text layer. */
export const MIN_CARACTERES_TEXTO = 40;

/** Stand-in for pdf.js OPS.paintImageXObject (85) and OPS.paintInlineImageXObject (86). */
const OPS_IMAGEN = new Set([85, 86]);

type ImagenPdf = { width: number; height: number; kind?: number; data?: Uint8Array | Uint8ClampedArray };

/** True when an extracted text has too few letters or digits to review: a scanned PDF. */
export function textoInsuficiente(texto: string | null | undefined): boolean {
  const util = (texto ?? "").match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return util < MIN_CARACTERES_TEXTO;
}

/**
 * A scanned PDF is pages of pictures with no text layer. This takes the largest picture on each of the
 * first pages, stacks them, and returns one JPEG for the vision path. No canvas is needed: pdf.js
 * decodes the image objects and sharp encodes them. Null when there is no picture to read.
 */
export async function imagenDePdf(bytes: Uint8Array, maxPaginas = MAX_PAGINAS_ESCANEO): Promise<{ bytes: Uint8Array; tipo: "image/jpeg" } | null> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
  try {
    // pdf.js may detach the buffer it gets, so it reads a copy.
    pdf = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 });
    const paginas = Math.min(pdf.numPages, Math.max(1, maxPaginas));
    const partes: Buffer[] = [];
    for (let numero = 1; numero <= paginas; numero += 1) {
      const pagina = await pdf.getPage(numero);
      const mayor = await imagenMayor(pagina);
      if (!mayor) continue;
      const jpeg = await aJpeg(mayor);
      if (jpeg) partes.push(jpeg);
    }
    if (partes.length === 0) return null;
    if (partes.length === 1) return { bytes: new Uint8Array(partes[0]!), tipo: "image/jpeg" };
    return { bytes: await apilar(partes), tipo: "image/jpeg" };
  } catch {
    return null;
  } finally {
    if (pdf) {
      try {
        await pdf.destroy();
      } catch {
        // The images are already collected.
      }
    }
  }
}

type PaginaPdf = Awaited<ReturnType<Awaited<ReturnType<typeof getDocumentProxy>>["getPage"]>>;

async function imagenMayor(pagina: PaginaPdf): Promise<ImagenPdf | null> {
  const operaciones = await pagina.getOperatorList();
  let mayor: ImagenPdf | null = null;
  for (let indice = 0; indice < operaciones.fnArray.length; indice += 1) {
    if (!OPS_IMAGEN.has(operaciones.fnArray[indice]!)) continue;
    const argumento = operaciones.argsArray[indice]?.[0];
    const imagen =
      typeof argumento === "string" ? await objetoImagen(pagina, argumento) : esImagen(argumento) ? (argumento as ImagenPdf) : null;
    if (!imagen || !imagen.data) continue;
    if (imagen.width < LADO_MINIMO_PX || imagen.height < LADO_MINIMO_PX) continue;
    if (!mayor || imagen.width * imagen.height > mayor.width * mayor.height) mayor = imagen;
  }
  return mayor;
}

function objetoImagen(pagina: PaginaPdf, nombre: string): Promise<ImagenPdf | null> {
  const almacen = nombre.startsWith("g_") ? pagina.commonObjs : pagina.objs;
  return new Promise((resolve) => {
    const tope = setTimeout(() => resolve(null), 3_000);
    try {
      almacen.get(nombre, (valor: unknown) => {
        clearTimeout(tope);
        resolve(esImagen(valor) ? (valor as ImagenPdf) : null);
      });
    } catch {
      clearTimeout(tope);
      resolve(null);
    }
  });
}

function esImagen(valor: unknown): boolean {
  if (!valor || typeof valor !== "object") return false;
  const imagen = valor as Partial<ImagenPdf>;
  return typeof imagen.width === "number" && typeof imagen.height === "number";
}

/** pdf.js kinds: 1 is 1 bit gray, 2 is RGB, 3 is RGBA. */
async function aJpeg(imagen: ImagenPdf): Promise<Buffer | null> {
  const datos = imagen.data;
  if (!datos) return null;
  const pixeles = imagen.width * imagen.height;
  let crudo: Buffer;
  let canales: 1 | 3 | 4;
  if (imagen.kind === 3 && datos.length >= pixeles * 4) {
    crudo = Buffer.from(datos.buffer, datos.byteOffset, pixeles * 4);
    canales = 4;
  } else if (imagen.kind === 2 && datos.length >= pixeles * 3) {
    crudo = Buffer.from(datos.buffer, datos.byteOffset, pixeles * 3);
    canales = 3;
  } else if (imagen.kind === 1) {
    crudo = gris1Bit(datos, imagen.width, imagen.height);
    canales = 1;
  } else {
    return null;
  }
  return sharp(crudo, { raw: { width: imagen.width, height: imagen.height, channels: canales } })
    .resize({ width: ANCHO_ESCANEO, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}

function gris1Bit(datos: Uint8Array | Uint8ClampedArray, ancho: number, alto: number): Buffer {
  const salida = Buffer.alloc(ancho * alto);
  const porFila = Math.ceil(ancho / 8);
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const byte = datos[y * porFila + (x >> 3)] ?? 0;
      salida[y * ancho + x] = byte & (0x80 >> (x & 7)) ? 255 : 0;
    }
  }
  return salida;
}

async function apilar(partes: Buffer[]): Promise<Uint8Array> {
  const medidas = await Promise.all(partes.map((parte) => sharp(parte).metadata()));
  const ancho = Math.max(...medidas.map((m) => m.width ?? 0));
  const alto = medidas.reduce((suma, m) => suma + (m.height ?? 0), 0);
  let y = 0;
  const capas = partes.map((parte, indice) => {
    const capa = { input: parte, top: y, left: 0 };
    y += medidas[indice]?.height ?? 0;
    return capa;
  });
  const lienzo = await sharp({ create: { width: ancho, height: alto, channels: 3, background: "#ffffff" } })
    .composite(capas)
    .jpeg({ quality: 85 })
    .toBuffer();
  return new Uint8Array(lienzo);
}
