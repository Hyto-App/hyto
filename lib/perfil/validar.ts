/**
 * Server-side checks for what a person writes about themselves (name and bio).
 * React escapes on render; these checks keep markup, scripts and contact data out of storage.
 * Messages are English codes that `lib/ui/claro.ts` style lookups can translate; the routes
 * send the dictionary key so the screen shows it in the person's language.
 */

export const MAX_NOMBRE = 60;
export const MIN_NOMBRE = 2;
export const MAX_BIO = 280;

export type MotivoTexto = "largo" | "corto" | "html" | "contacto" | "tipo";

export type TextoValidado = { ok: true; valor: string } | { ok: false; motivo: MotivoTexto };

// Tags, entities, javascript:/data: URLs and inline handlers.
const MARCADO = /<|>|&(?:#\d+|#x[0-9a-f]+|[a-z]+);|javascript\s*:|data\s*:\s*text\/html|vbscript\s*:|\bon[a-z]+\s*=/i;
// Control characters other than line breaks and tabs.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/;
const CORREO = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// Seven or more digits, allowing spaces, dots, dashes and a leading +: a phone number.
const TELEFONO = /\+?\d(?:[\s.\-()]*\d){6,}/;

function normalizar(valor: string): string {
  return valor.normalize("NFC").replace(/\r\n?/g, "\n").trim();
}

function revisar(valor: string): MotivoTexto | null {
  if (MARCADO.test(valor)) return "html";
  if (CONTROL.test(valor)) return "html";
  if (CORREO.test(valor) || TELEFONO.test(valor)) return "contacto";
  return null;
}

/** A display name: 2 to 60 characters, one line, no markup, no email or phone. */
export function validarNombre(entrada: unknown): TextoValidado {
  if (typeof entrada !== "string") return { ok: false, motivo: "tipo" };
  const valor = normalizar(entrada).replace(/\s+/g, " ");
  if ([...valor].length < MIN_NOMBRE) return { ok: false, motivo: "corto" };
  if ([...valor].length > MAX_NOMBRE) return { ok: false, motivo: "largo" };
  if (!/\p{L}/u.test(valor)) return { ok: false, motivo: "corto" };
  const motivo = revisar(valor);
  return motivo ? { ok: false, motivo } : { ok: true, valor };
}

/** A short bio: empty is fine, up to 280 characters, no markup, no email or phone. */
export function validarBio(entrada: unknown): TextoValidado {
  if (entrada === undefined || entrada === null) return { ok: true, valor: "" };
  if (typeof entrada !== "string") return { ok: false, motivo: "tipo" };
  const valor = normalizar(entrada);
  if ([...valor].length > MAX_BIO) return { ok: false, motivo: "largo" };
  if (!valor) return { ok: true, valor: "" };
  const motivo = revisar(valor);
  return motivo ? { ok: false, motivo } : { ok: true, valor };
}
