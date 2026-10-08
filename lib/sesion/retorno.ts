/** Default signed-in landing when no safe return path was preserved. */
/** Same default as Google sign-in: `/` then redirects signed-in users to Events. */
export const DESTINO_TRAS_INGRESO = "/";

export const CLAVE_RETORNO = "hyto-retorno";

/**
 * Relative in-app path only. Rejects protocol-relative and absolute URLs so
 * `next` cannot be used as an open redirect.
 */
export function rutaRetornoSegura(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const ruta = valor.trim();
  if (!ruta.startsWith("/") || ruta.startsWith("//")) return null;
  if (ruta.includes("\\") || ruta.includes("@")) return null;
  if (/[\u0000-\u001F\u007F]/.test(ruta)) return null;
  return ruta;
}

/** Sign-in URL that optionally carries a validated return path. */
export function urlSignin(retorno?: string | null): string {
  const next = rutaRetornoSegura(retorno);
  if (!next) return "/?signin=1";
  return `/?signin=1&next=${encodeURIComponent(next)}`;
}

export function destinoTrasIngreso(preferido?: string | null, fallback: string = DESTINO_TRAS_INGRESO): string {
  return rutaRetornoSegura(preferido) ?? fallback;
}

function esPasoTipo(ruta: string): boolean {
  return ruta === "/configuracion/tipo" || ruta.startsWith("/configuracion/tipo?");
}

/**
 * After the one-time account-type step. A safe `next` wins. Otherwise Events, where a new
 * account creates an event.
 */
export function destinoTrasTipo(next: unknown): string {
  const seguro = rutaRetornoSegura(next);
  if (!seguro || esPasoTipo(seguro)) return "/eventos";
  return seguro;
}

/** Sends a signed-in person to choose an account type, keeping a safe page to return to. */
export function rutaElegirTipo(retorno?: string | null): string {
  const seguro = rutaRetornoSegura(retorno);
  if (!seguro || esPasoTipo(seguro)) return "/configuracion/tipo";
  return `/configuracion/tipo?next=${encodeURIComponent(seguro)}`;
}

export function guardarRetorno(valor: string, almacenamiento: Pick<Storage, "setItem"> = sessionStorage): void {
  const seguro = rutaRetornoSegura(valor);
  if (!seguro) return;
  try {
    almacenamiento.setItem(CLAVE_RETORNO, seguro);
  } catch {
    // A blocked store drops the return path; sign-in still lands on the default.
  }
}

export function leerRetorno(almacenamiento: Pick<Storage, "getItem"> = sessionStorage): string | null {
  try {
    return rutaRetornoSegura(almacenamiento.getItem(CLAVE_RETORNO));
  } catch {
    return null;
  }
}

export function olvidarRetorno(almacenamiento: Pick<Storage, "removeItem"> = sessionStorage): void {
  try {
    almacenamiento.removeItem(CLAVE_RETORNO);
  } catch {
    // Leaving a stale path is safe: it is validated again before use.
  }
}
