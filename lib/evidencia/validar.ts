import type { TipoEvidencia } from "@/lib/evidencia/tipo";
import { tipoPorBytes, tipoTextoDeclarado } from "@/lib/evidencia/tipo";
import { texto, type Clave } from "@/lib/ui/diccionario";

/** Rejects a ~30 MB upload. 10 MB is enough for a receipt or a camera photo. */
export const MAX_BYTES_ARCHIVO = 10 * 1024 * 1024;

/**
 * Rejects a 1×1 (and anything else too small to review).
 * The sample JPEG used in tests is 32×24, so the floor stays under that.
 */
export const MIN_LADO_PX = 8;

export type MotivoArchivo = "vacio" | "falso" | "pequena" | "grande" | "tipo";

export type ArchivoValido = {
  ok: true;
  tipo: TipoEvidencia;
  ancho: number | null;
  alto: number | null;
};

export type ArchivoInvalido = { ok: false; motivo: MotivoArchivo };

type Medidas = { ancho: number; alto: number };

const CLAVES: Record<MotivoArchivo, Clave> = {
  vacio: "evidencia.archivoVacio",
  falso: "evidencia.archivoFalso",
  pequena: "evidencia.archivoPequena",
  grande: "evidencia.archivoGrande",
  tipo: "evidencia.badFile",
};

export function avisoArchivo(motivo: MotivoArchivo): string {
  return texto("en", CLAVES[motivo]);
}

type BlobLeible = { size: number; arrayBuffer: () => Promise<ArrayBuffer>; type?: string; name?: string };

/** Size is checked before the bytes are read, so a 30 MB file is refused without decoding it. */
export async function evaluarArchivo(archivo: BlobLeible, opciones?: { soloJpeg?: boolean }): Promise<ArchivoValido | ArchivoInvalido> {
  if (archivo.size <= 0) return { ok: false, motivo: "vacio" };
  if (archivo.size > MAX_BYTES_ARCHIVO) return { ok: false, motivo: "grande" };
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  return validarBytes(bytes, { soloJpeg: opciones?.soloJpeg, tipo: archivo.type, nombre: archivo.name });
}

export function validarBytes(
  bytes: Uint8Array,
  opciones?: { soloJpeg?: boolean; tipo?: string | null; nombre?: string | null },
): ArchivoValido | ArchivoInvalido {
  if (bytes.byteLength === 0) return { ok: false, motivo: "vacio" };
  if (bytes.byteLength > MAX_BYTES_ARCHIVO) return { ok: false, motivo: "grande" };
  const tipo = tipoPorBytes(bytes);
  if (!tipo) {
    const textual = tipoTextoDeclarado(opciones?.tipo ?? "", opciones?.nombre ?? "", bytes);
    if (!textual) return { ok: false, motivo: "falso" };
    if (opciones?.soloJpeg) return { ok: false, motivo: "tipo" };
    return { ok: true, tipo: textual, ancho: null, alto: null };
  }
  if (opciones?.soloJpeg && tipo !== "image/jpeg") return { ok: false, motivo: "tipo" };
  if (tipo === "application/pdf") return { ok: true, tipo, ancho: null, alto: null };
  const medidas = medidasDe(bytes, tipo);
  if (!medidas) return { ok: false, motivo: "falso" };
  if (medidas.ancho < MIN_LADO_PX || medidas.alto < MIN_LADO_PX) return { ok: false, motivo: "pequena" };
  return { ok: true, tipo, ancho: medidas.ancho, alto: medidas.alto };
}

function medidasDe(bytes: Uint8Array, tipo: TipoEvidencia): Medidas | null {
  if (tipo === "image/png") return medidasPng(bytes);
  if (tipo === "image/webp") return medidasWebp(bytes);
  if (tipo === "image/jpeg") return medidasJpeg(bytes);
  return null;
}

function medidasPng(bytes: Uint8Array): Medidas | null {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== "IHDR") return null;
  return positivo(leer32(bytes, 16), leer32(bytes, 20));
}

function medidasWebp(bytes: Uint8Array): Medidas | null {
  if (bytes.length < 30) return null;
  const etiqueta = ascii(bytes, 12, 4);
  if (etiqueta === "VP8X") {
    const ancho = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const alto = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return positivo(ancho, alto);
  }
  if (etiqueta === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    const ancho = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const alto = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    return positivo(ancho, alto);
  }
  if (etiqueta === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return positivo((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
  }
  return null;
}

function medidasJpeg(bytes: Uint8Array): Medidas | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    while (i < bytes.length && bytes[i] === 0xff) i += 1;
    if (i >= bytes.length) return null;
    const marcador = bytes[i];
    i += 1;
    if (marcador === 0xd9 || marcador === 0xda) return null;
    if (marcador >= 0xd0 && marcador <= 0xd7) continue;
    if (i + 1 >= bytes.length) return null;
    const longitud = (bytes[i] << 8) | bytes[i + 1];
    if (longitud < 2 || i + longitud > bytes.length) return null;
    if (esSof(marcador)) {
      if (longitud < 7) return null;
      const alto = (bytes[i + 3] << 8) | bytes[i + 4];
      const ancho = (bytes[i + 5] << 8) | bytes[i + 6];
      return positivo(ancho, alto);
    }
    i += longitud;
  }
  return null;
}

function esSof(marcador: number): boolean {
  return (
    (marcador >= 0xc0 && marcador <= 0xc3) ||
    (marcador >= 0xc5 && marcador <= 0xc7) ||
    (marcador >= 0xc9 && marcador <= 0xcb) ||
    (marcador >= 0xcd && marcador <= 0xcf)
  );
}

function positivo(ancho: number, alto: number): Medidas | null {
  if (!Number.isInteger(ancho) || !Number.isInteger(alto)) return null;
  if (ancho < 1 || alto < 1 || ancho > 100_000 || alto > 100_000) return null;
  return { ancho, alto };
}

function leer32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function ascii(bytes: Uint8Array, offset: number, largo: number): string {
  let texto = "";
  for (let i = 0; i < largo; i += 1) texto += String.fromCharCode(bytes[offset + i] ?? 0);
  return texto;
}
