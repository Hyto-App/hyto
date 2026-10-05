export const ESPERA_TRAS_ENVIO = 20;
const ESPERA_SI_FALTA = 20;

export const AVISO_GENERICO = "Could not sign in. Try again.";
export const AVISO_CODIGO_INVALIDO = "That code does not match. Check your email and try again.";
export const AVISO_CODIGO_VENCIDO = "That code expired. Request another one.";
export const AVISO_RED = "No connection. Check the network and try again.";
export const AVISO_GOOGLE_CERRADO = "You closed the Google window. Try again.";
export const AVISO_GOOGLE_BLOQUEADO = "The browser blocked the Google window. Allow it and try again.";
export const AVISO_CONFIG = "Sign-in isn't set up yet.";
export const AVISO_CORREO = "Enter a valid email.";
export const AVISO_DEMO = "That demo email does not receive messages. Use a real email or sign in with Google.";
export const AVISO_SIN_CUENTA = "No Hyto account for this sign-in. Sign up first.";
export const AVISO_SPAM = "The code arrives by email. Check spam too.";

export type AvisoIngreso = {
  texto: string;
  esperaSegundos: number | null;
};

export function textoEspera(segundos: number): string {
  const n = Math.max(0, Math.ceil(segundos));
  return `Wait ${n} s before requesting another code`;
}

export function correoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim().toLowerCase());
}

export function esCorreoDemo(correo: string): boolean {
  const dominio = correo.trim().toLowerCase().split("@")[1] ?? "";
  return dominio === "demo.hyto";
}

export function avisoDeIngreso(error: unknown): AvisoIngreso {
  const texto = textoDe(error);
  const datos = jsonEmpotrado(texto);
  const codigo = codigoDe(datos);
  const mensaje = mensajeDe(datos);
  const detalle = `${codigo} ${mensaje}`.trim() || texto.toLowerCase();

  if (esLimite(texto, codigo, mensaje)) {
    const segundos = segundosDeEspera(datos, mensaje || texto) ?? ESPERA_SI_FALTA;
    const espera = Math.max(1, Math.ceil(segundos));
    return { texto: textoEspera(espera), esperaSegundos: espera };
  }
  if (esConfig(texto, codigo)) return fijo(AVISO_CONFIG);
  if (esPopupBloqueado(detalle)) return fijo(AVISO_GOOGLE_BLOQUEADO);
  if (esPopupCerrado(detalle)) return fijo(AVISO_GOOGLE_CERRADO);
  if (esRed(error, texto)) return fijo(AVISO_RED);
  if (esVencido(detalle)) return fijo(AVISO_CODIGO_VENCIDO);
  if (esCodigoInvalido(detalle)) return fijo(AVISO_CODIGO_INVALIDO);
  if (esCorreoInvalido(detalle)) return fijo(AVISO_CORREO);
  return fijo(AVISO_GENERICO);
}

function fijo(texto: string): AvisoIngreso {
  return { texto, esperaSegundos: null };
}

function textoDe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "";
    }
  }
  return "";
}

function jsonEmpotrado(texto: string): Record<string, unknown> | null {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) return null;
  try {
    const valor = JSON.parse(texto.slice(inicio, fin + 1)) as unknown;
    if (valor && typeof valor === "object" && !Array.isArray(valor)) return valor as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

function codigoDe(datos: Record<string, unknown> | null): string {
  const bruto = datos?.error ?? datos?.code ?? datos?.error_code;
  return typeof bruto === "string" ? bruto.toLowerCase() : "";
}

function mensajeDe(datos: Record<string, unknown> | null): string {
  const bruto = datos?.message ?? datos?.error_description;
  return typeof bruto === "string" ? bruto.toLowerCase() : "";
}

function esLimite(texto: string, codigo: string, mensaje: string): boolean {
  if (codigo === "rate_limited" || codigo === "rate_limit" || codigo === "too_many_requests") return true;
  if (/->\s*429\b/.test(texto)) return true;
  const junto = `${texto} ${mensaje}`.toLowerCase();
  return junto.includes("rate_limited") || junto.includes("too many requests") || /wait\s+\d+(?:\.\d+)?\s+seconds?/.test(junto);
}

function segundosDeEspera(datos: Record<string, unknown> | null, texto: string): number | null {
  if (datos) {
    for (const clave of ["wait_seconds", "waitSeconds", "retry_after", "retryAfter"]) {
      const n = comoNumero(datos[clave]);
      if (n !== null) return n;
    }
  }
  const explicito = texto.match(/wait_seconds"?\s*[:=]\s*(\d+(?:\.\d+)?)/i);
  if (explicito) return Number(explicito[1]);
  const frase = texto.match(/wait\s+(\d+(?:\.\d+)?)\s+seconds?/i);
  if (frase) return Number(frase[1]);
  return null;
}

function comoNumero(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function esConfig(texto: string, codigo: string): boolean {
  const t = `${codigo} ${texto}`.toLowerCase();
  return (
    t.includes("next_public_cavos_app_id") ||
    t.includes("identificador de cavos") ||
    t.includes("cavos app id") ||
    t.includes("not configured for sign-in") ||
    t.includes("missing app id") ||
    t.includes("app_id is required")
  );
}

function esPopupBloqueado(texto: string): boolean {
  return /popup[-_\s]?blocked/.test(texto) || (texto.includes("popup") && texto.includes("block"));
}

function esPopupCerrado(texto: string): boolean {
  return /popup[-_\s]?closed/.test(texto) || texto.includes("closed by user") || (texto.includes("popup") && texto.includes("closed"));
}

function esRed(error: unknown, texto: string): boolean {
  if (error instanceof TypeError && !/json/i.test(error.message)) return true;
  const t = texto.toLowerCase();
  return (
    t.includes("failed to fetch") ||
    t.includes("networkerror") ||
    t.includes("network request failed") ||
    t.includes("load failed") ||
    t.includes("net::err") ||
    t.includes("econnrefused") ||
    t.includes("enotfound") ||
    t.includes("offline")
  );
}

function esVencido(pista: string): boolean {
  return /expir/.test(pista) || pista.includes("code-expired") || pista.includes("vencid");
}

function esCodigoInvalido(pista: string): boolean {
  return (
    pista.includes("invalid_code") ||
    pista.includes("invalid_otp") ||
    pista.includes("invalid-verification-code") ||
    pista.includes("wrong_code") ||
    pista.includes("incorrect") ||
    (/invalid/.test(pista) && /code|otp|c[oó]digo/.test(pista))
  );
}

function esCorreoInvalido(pista: string): boolean {
  return pista.includes("invalid_email") || pista.includes("invalid-email") || (/invalid/.test(pista) && pista.includes("email"));
}
