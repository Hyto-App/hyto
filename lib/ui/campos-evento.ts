/** Pure rules for the event-details fields of Create event. */

export const UMBRAL_CONTADOR = 0.9;

/** True from 90 % of the limit up: the counter turns pink and the change is announced once. */
export function contadorCerca(largo: number, max: number): boolean {
  return max > 0 && largo >= max * UMBRAL_CONTADOR;
}

export const TIPOS_PORTADA = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES_PORTADA = 5 * 1024 * 1024;

/** Which rule a cover file breaks, if any. The picker's `accept` does not stop a drop. */
export function errorPortada(archivo: { type: string; size: number }): "type" | "size" | null {
  if (!TIPOS_PORTADA.includes(archivo.type)) return "type";
  if (archivo.size > MAX_BYTES_PORTADA) return "size";
  return null;
}

/** The context box opens when it has text or after the organizer opened it. */
export function contextoAbierto(texto: string, abiertoPorUsuario: boolean): boolean {
  return abiertoPorUsuario || texto.length > 0;
}
