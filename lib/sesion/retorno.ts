import { AVISO_BASE_SESION } from "@/lib/auth/errores";

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

/** Codes the sign-in URL may carry in `?error=`. Only a code travels, never the server error text. */
export type ErrorSesionUrl = "base";

const AVISOS_ERROR_URL: Record<ErrorSesionUrl, string> = {
  base: AVISO_BASE_SESION,
};

export function avisoDeErrorUrl(valor: unknown): string | null {
  if (typeof valor !== "string" || !Object.prototype.hasOwnProperty.call(AVISOS_ERROR_URL, valor)) return null;
  return AVISOS_ERROR_URL[valor as ErrorSesionUrl];
}

/** Sign-in URL that optionally carries a validated return path and an error code. */
export function urlSignin(retorno?: string | null, error?: ErrorSesionUrl | null): string {
  const next = rutaRetornoSegura(retorno);
  const sufijo = error && avisoDeErrorUrl(error) ? `&error=${error}` : "";
  if (!next) return `/?signin=1${sufijo}`;
  return `/?signin=1&next=${encodeURIComponent(next)}${sufijo}`;
}

export function destinoTrasIngreso(preferido?: string | null, fallback: string = DESTINO_TRAS_INGRESO): string {
  return rutaRetornoSegura(preferido) ?? fallback;
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
