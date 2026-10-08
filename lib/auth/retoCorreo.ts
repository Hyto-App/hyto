import { intencionDe, type IntencionIngreso } from "@/lib/auth/intencion";

/**
 * The email code is checked against the nonce `@cavos/kit` kept on the auth
 * instance (`pendingNonce`). That value dies with the page. A reload — leaving
 * to read the mail on a `no-store` document, or the session watcher navigating
 * `/` to `/?signin=1` — makes the code that already arrived useless, and a
 * retry mints a different nonce.
 *
 * The nonce is not a signing key. It stays in sessionStorage, same tab only,
 * and is dropped when the code step is left or after ten minutes.
 */
export const CLAVE_RETO_CORREO = "hyto-reto-correo";
export const VIDA_RETO_MS = 10 * 60 * 1000;

export type RetoCorreo = {
  email: string;
  nonce: string;
  intencion: IntencionIngreso;
};

type AlmacenReto = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function nonceDe(auth: object): string | null {
  const valor = (auth as { pendingNonce?: unknown }).pendingNonce;
  return typeof valor === "string" && valor.trim() ? valor : null;
}

export function ponerNonce(auth: object, nonce: string): void {
  (auth as { pendingNonce: string | null }).pendingNonce = nonce;
}

/**
 * `verifyOtp` clears `pendingNonce` before the network call returns. If that
 * call fails, the next try would send a new nonce and Cavos rejects the same
 * code. Put the nonce back so the retry matches the email that was sent.
 */
export async function conNonce<T>(auth: object, correr: () => Promise<T>): Promise<T> {
  const nonce = nonceDe(auth);
  try {
    return await correr();
  } catch (error) {
    if (nonce) ponerNonce(auth, nonce);
    throw error;
  }
}

export function guardarRetoCorreo(reto: RetoCorreo, ahora = Date.now(), almacenamiento?: AlmacenReto): void {
  const caja = almacenDe(almacenamiento);
  if (!caja || !reto.email.trim() || !reto.nonce.trim()) return;
  try {
    caja.setItem(
      CLAVE_RETO_CORREO,
      JSON.stringify({ email: reto.email.trim().toLowerCase(), nonce: reto.nonce, intencion: reto.intencion, hasta: ahora + VIDA_RETO_MS }),
    );
  } catch {
    // A blocked store still works until the tab reloads.
  }
}

export function leerRetoCorreo(ahora = Date.now(), almacenamiento?: AlmacenReto): RetoCorreo | null {
  const caja = almacenDe(almacenamiento);
  if (!caja) return null;
  try {
    const crudo = caja.getItem(CLAVE_RETO_CORREO);
    if (!crudo) return null;
    const json = JSON.parse(crudo) as { email?: unknown; nonce?: unknown; intencion?: unknown; hasta?: unknown };
    const email = typeof json.email === "string" ? json.email.trim().toLowerCase() : "";
    const nonce = typeof json.nonce === "string" ? json.nonce : "";
    const intencion = intencionDe(json.intencion);
    const hasta = typeof json.hasta === "number" ? json.hasta : 0;
    if (!email || !email.includes("@") || !nonce || !intencion || hasta <= ahora) {
      caja.removeItem(CLAVE_RETO_CORREO);
      return null;
    }
    return { email, nonce, intencion };
  } catch {
    return null;
  }
}

export function olvidarRetoCorreo(almacenamiento?: AlmacenReto): void {
  const caja = almacenDe(almacenamiento);
  if (!caja) return;
  try {
    caja.removeItem(CLAVE_RETO_CORREO);
  } catch {
    // Nothing left to clear.
  }
}

export function hayRetoCorreo(ahora = Date.now(), almacenamiento?: AlmacenReto): boolean {
  return leerRetoCorreo(ahora, almacenamiento) !== null;
}

function almacenDe(dado?: AlmacenReto): AlmacenReto | null {
  if (dado) return dado;
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}
