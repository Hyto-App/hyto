/**
 * The resend countdown has to outlive a reload. The code step is already
 * restored from sessionStorage; without the deadline, Resend code is active
 * at once and the server still answers 429.
 */
export const CLAVE_ESPERA_REENVIO = "hyto-espera-reenvio";

type AlmacenEspera = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function guardarEsperaReenvio(segundos: number, ahora = Date.now(), almacenamiento?: AlmacenEspera): void {
  const sitio = caja(almacenamiento);
  if (!sitio) return;
  const n = Math.max(1, Math.ceil(segundos));
  try {
    sitio.setItem(CLAVE_ESPERA_REENVIO, String(ahora + n * 1000));
  } catch {
    // The countdown still runs until the tab reloads.
  }
}

/** Seconds still left. 0 once the deadline has passed, and the key is dropped. */
export function leerEsperaReenvio(ahora = Date.now(), almacenamiento?: AlmacenEspera): number {
  const sitio = caja(almacenamiento);
  if (!sitio) return 0;
  try {
    const crudo = sitio.getItem(CLAVE_ESPERA_REENVIO);
    const hasta = Number(crudo);
    if (!Number.isFinite(hasta) || hasta <= ahora) {
      if (crudo !== null) sitio.removeItem(CLAVE_ESPERA_REENVIO);
      return 0;
    }
    return Math.max(1, Math.ceil((hasta - ahora) / 1000));
  } catch {
    return 0;
  }
}

export function olvidarEsperaReenvio(almacenamiento?: AlmacenEspera): void {
  const sitio = caja(almacenamiento);
  if (!sitio) return;
  try {
    sitio.removeItem(CLAVE_ESPERA_REENVIO);
  } catch {
    // Nothing left to clear.
  }
}

function caja(dada?: AlmacenEspera): AlmacenEspera | null {
  if (dada) return dada;
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}
