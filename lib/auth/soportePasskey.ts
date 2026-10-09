/**
 * Whether this browser can open the passkey sheet.
 *
 * `@cavos/kit` 0.2.5 `PasskeyPrf.isSupported()` is only
 * `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`.
 * That answers "is there a built-in authenticator?" (Touch ID, Face ID, Windows Hello).
 * It is false on desktop Linux Chrome, including when DevTools has a virtual
 * authenticator, because Linux does not advertise a platform authenticator.
 *
 * `PasskeyPrf.enroll()` does not set `authenticatorAttachment`. The browser sheet
 * can use a platform authenticator, a security key, a phone QR code, or a virtual
 * authenticator. Gating the button on the platform check hides that sheet.
 *
 * Mac and phones still pass: they expose `PublicKeyCredential` in a secure context,
 * and the sheet keeps offering their platform authenticator. This environment cannot
 * open that sheet on a real Mac or phone.
 */
export type WebAuthnMinimo = {
  crear: boolean;
  contextoSeguro: boolean;
};

export function navegadorPuedeCrearPasskey(webauthn: WebAuthnMinimo | null): boolean {
  if (!webauthn?.crear) return false;
  return webauthn.contextoSeguro;
}

export function leerWebAuthn(): WebAuthnMinimo | null {
  if (typeof window === "undefined") return null;
  const credencial = window.PublicKeyCredential;
  const crear = typeof navigator !== "undefined" && typeof navigator.credentials?.create === "function";
  if (!credencial || !crear) return { crear: false, contextoSeguro: window.isSecureContext };
  return { crear: true, contextoSeguro: window.isSecureContext };
}
