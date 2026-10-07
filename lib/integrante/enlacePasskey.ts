/**
 * Deep link to the "Use Hyto on other devices" card on Account.
 *
 * `/account` is a short alias of `/cuentas` (see `next.config.ts`), so the link is easy to read
 * aloud or type on another computer. The query survives the redirect and the sign-in round trip
 * (`next`); the hash is for a browser that is already signed in.
 */
export const ANCLA_PASSKEY = "passkey";
export const PARAM_PASSKEY = "add";
export const RUTA_CUENTA_CORTA = "/account";
export const RUTA_PASSKEY_CUENTAS = `/cuentas?${PARAM_PASSKEY}=${ANCLA_PASSKEY}`;

/** Absolute link for "Copy link" and "Share". The account key lives per site, so it keeps this origin. */
export function enlacePasskey(origen: string): string {
  const base = origen.replace(/\/+$/, "");
  return `${base}${RUTA_CUENTA_CORTA}?${PARAM_PASSKEY}=${ANCLA_PASSKEY}#${ANCLA_PASSKEY}`;
}

/** What the guide shows: host and path only, e.g. `hyto.vercel.app/account`. */
export function enlacePasskeyVisible(host: string): string {
  return `${host.replace(/\/+$/, "")}${RUTA_CUENTA_CORTA}`;
}

/** True when Account was opened from the guide's link. */
export function pidePasskey(busqueda: string, hash: string): boolean {
  if (hash.replace(/^#/, "") === ANCLA_PASSKEY) return true;
  return new URLSearchParams(busqueda).get(PARAM_PASSKEY) === ANCLA_PASSKEY;
}
