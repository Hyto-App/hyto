const CLAVE = "hyto_mile_presentado";

let tomada = false;

/** True once per browser, for the first surface that introduces Mile. */
export function tomarPresentacionMile(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(CLAVE) === "1") return false;
  } catch {
    return false;
  }
  if (tomada) return false;
  tomada = true;
  try {
    window.localStorage.setItem(CLAVE, "1");
  } catch {
    // Still show the line this once when storage is blocked.
  }
  return true;
}

/** Test helper. Production code does not call this. */
export function reiniciarPresentacionMile(): void {
  tomada = false;
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    // ignore
  }
}
