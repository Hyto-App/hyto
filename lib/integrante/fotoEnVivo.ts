/** Ventana para un archivo que llega por el input con `capture`. Una foto de la galería suele ser más vieja. */
export const EDAD_MAXIMA_MS = 3 * 60 * 1000;

const TIPOS_FOTO = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function esTipoFoto(tipo: string): boolean {
  const base = tipo.split(";")[0]?.trim().toLowerCase() ?? "";
  return TIPOS_FOTO.has(base);
}

/**
 * El servidor no ve `lastModified`. Acepta estos tipos y, si el teléfono no manda tipo, un archivo con bytes.
 * No prueba que la foto se haya tomado en el momento.
 */
export function fotoAceptada(tipo: string, bytes: number): boolean {
  if (bytes <= 0) return false;
  if (!tipo.trim()) return true;
  return esTipoFoto(tipo);
}

/**
 * `lastModified` es una pista. Algunos navegadores la ponen en "ahora" aunque el archivo venga de la galería,
 * y un escritorio puede ignorar `capture` y abrir el selector de archivos.
 */
export function archivoDeCamaraReciente(archivo: File, ahora = Date.now()): boolean {
  if (!fotoAceptada(archivo.type, archivo.size)) return false;
  if (!Number.isFinite(archivo.lastModified)) return false;
  const edad = ahora - archivo.lastModified;
  if (edad < -60_000) return false;
  return edad <= EDAD_MAXIMA_MS;
}
