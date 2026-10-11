/** Ventana para un archivo que llega por el input con `capture`. Igual a `TOLERANCIA_FRESCURA_MS` del servidor. */
export const EDAD_MAXIMA_MS = 3 * 60 * 1000;

/**
 * Campo `origen` del envío para un archivo elegido con «Subir archivo» o soltado en la zona.
 * Va sin token de cámara: el servidor valida los bytes y no mira la frescura.
 */
export const ORIGEN_ARCHIVO = "archivo";

/** Nombre viejo de `ORIGEN_ARCHIVO`. El servidor lo sigue aceptando igual. */
export const ORIGEN_GALERIA = "galeria";

/** Lo que abría el selector de galería del demo. El servidor lee los bytes de todos modos. */
export const ACCEPT_GALERIA = "image/jpeg,image/png,image/webp";

export const AVISO_GALERIA_TIPO = "Choose a JPEG, PNG, or WebP photo.";

/** El camino de cámara en vivo de un trabajo solo acepta JPEG. Sin tipo pasa: el servidor lee los bytes. */
export function esFotoDeCamara(archivo: Blob): boolean {
  if (archivo.size <= 0) return false;
  const tipo = archivo.type.split(";")[0]?.trim().toLowerCase() ?? "";
  return tipo === "" || tipo === "image/jpeg" || tipo === "image/jpg";
}

/**
 * `lastModified` es una pista. Algunos navegadores la ponen en "ahora" aunque el archivo venga de la galería,
 * y un escritorio puede ignorar `capture` y abrir el selector de archivos.
 */
export function archivoDeCamaraReciente(archivo: File, ahora = Date.now()): boolean {
  if (!esFotoDeCamara(archivo)) return false;
  if (!Number.isFinite(archivo.lastModified)) return false;
  const edad = ahora - archivo.lastModified;
  if (edad < -60_000) return false;
  return edad <= EDAD_MAXIMA_MS;
}
