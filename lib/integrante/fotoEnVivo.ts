/** Ventana para un archivo que llega por el input con `capture`. Igual a `TOLERANCIA_FRESCURA_MS` del servidor. */
export const EDAD_MAXIMA_MS = 3 * 60 * 1000;

/** Campo `origen` del envío. Solo el evento demo lo acepta: ahí una foto de galería salta token y frescura. */
export const ORIGEN_GALERIA = "galeria";

/** Lo que abre el selector de galería. El servidor lee los bytes de todos modos. */
export const ACCEPT_GALERIA = "image/jpeg,image/png,image/webp";

export const AVISO_GALERIA_TIPO = "Choose a JPEG, PNG, or WebP photo.";

/** Un trabajo solo acepta JPEG en el servidor. Sin tipo pasa: el servidor lee los bytes. */
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
