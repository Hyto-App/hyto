/**
 * Deep link to the "Use Hyto on other devices" card on Settings (`/configuracion`).
 *
 * The guide names Settings, so the link opens Settings itself. The query survives the sign-in
 * round trip (`next`); the hash is for a browser that is already signed in. `/account` stays a
 * redirect to `/cuentas` (see `next.config.ts`) for links sent before this change.
 */
export const ANCLA_PASSKEY = "passkey";
export const PARAM_PASSKEY = "add";
export const RUTA_CONFIGURACION = "/configuracion";
export const RUTA_PASSKEY_CUENTAS = `/cuentas?${PARAM_PASSKEY}=${ANCLA_PASSKEY}`;

/** Absolute link for "Copy link" and "Share". The account key lives per site, so it keeps this origin. */
export function enlacePasskey(origen: string): string {
  const base = origen.replace(/\/+$/, "");
  return `${base}${RUTA_CONFIGURACION}?${PARAM_PASSKEY}=${ANCLA_PASSKEY}#${ANCLA_PASSKEY}`;
}

/** What the guide shows: host and path only, e.g. `hyto.vercel.app/configuracion`. */
export function enlacePasskeyVisible(host: string): string {
  return `${host.replace(/\/+$/, "")}${RUTA_CONFIGURACION}`;
}

/** True when Settings was opened from the guide's link. */
export function pidePasskey(busqueda: string, hash: string): boolean {
  if (hash.replace(/^#/, "") === ANCLA_PASSKEY) return true;
  return new URLSearchParams(busqueda).get(PARAM_PASSKEY) === ANCLA_PASSKEY;
}
