import { appIdPublico } from "@/lib/config/publico";

const HOLGURA_MS = 30_000;

type IdentidadMinima = { userId: string };

type AuthConIdentidad = {
  restoreIdentity(): IdentidadMinima | null;
};

export function claveIdentidadCavos(appId: string): string {
  return `cavos-kit:identity:${appId}`;
}

export function claveTokenCavos(appId: string): string {
  return `cavos-kit:token:${appId}`;
}

export function claveEspejoToken(appId: string): string {
  return `hyto:cavos-token:${appId}`;
}

// @cavos/kit 0.2.5 keeps the access token in sessionStorage and has no refresh
// grant. A token that is still inside its `exp` can be copied back before
// signing. An expired token cannot be renewed.
export function tokenCavosVigente(token: string, ahoraMs = Date.now()): boolean {
  const claims = claimsDeToken(token);
  if (!claims) return false;
  const exp = claims.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return ahoraMs < exp * 1000 - HOLGURA_MS;
}

export function recordarTokenCavos(token: string | null, appId = appIdPublico()): void {
  if (!appId || !token || typeof window === "undefined") return;
  if (!tokenCavosVigente(token)) return;
  window.sessionStorage.setItem(claveTokenCavos(appId), token);
  window.localStorage.setItem(claveEspejoToken(appId), token);
}

export function userIdCavosGuardado(appId: string | null): string | null {
  if (!appId || typeof window === "undefined") return null;
  const clave = claveIdentidadCavos(appId);
  return userIdDe(window.localStorage.getItem(clave)) ?? userIdDe(window.sessionStorage.getItem(clave));
}

export function borrarCavosLocal(appId: string | null): void {
  if (!appId || typeof window === "undefined") return;
  const claves = [claveIdentidadCavos(appId), claveTokenCavos(appId), claveEspejoToken(appId)];
  for (const clave of claves) {
    window.sessionStorage.removeItem(clave);
    window.localStorage.removeItem(clave);
  }
}

export function asegurarIdentidadCavos(auth: AuthConIdentidad, appId = appIdPublico()): boolean {
  if (typeof window === "undefined" || !appId) return Boolean(auth.restoreIdentity());
  promoverIdentidad(appId);
  const token = tokenUtil(appId);
  if (token) {
    window.sessionStorage.setItem(claveTokenCavos(appId), token);
    window.localStorage.setItem(claveEspejoToken(appId), token);
  } else {
    window.sessionStorage.removeItem(claveTokenCavos(appId));
    window.localStorage.removeItem(claveEspejoToken(appId));
  }
  if (auth.restoreIdentity()) return true;
  if (!token) return false;
  const claims = claimsDeToken(token);
  const userId = userIdDeClaims(claims);
  if (!userId) return false;
  const identidad: Record<string, string> = { userId, provider: "otp" };
  if (claims && typeof claims.email === "string" && claims.email.trim()) identidad.email = claims.email.trim();
  if (claims && typeof claims.name === "string" && claims.name.trim()) identidad.name = claims.name.trim();
  window.localStorage.setItem(claveIdentidadCavos(appId), JSON.stringify(identidad));
  return Boolean(auth.restoreIdentity());
}

function promoverIdentidad(appId: string): void {
  const clave = claveIdentidadCavos(appId);
  if (userIdDe(window.localStorage.getItem(clave))) return;
  const enSesion = window.sessionStorage.getItem(clave);
  if (!userIdDe(enSesion)) return;
  window.localStorage.setItem(clave, enSesion as string);
}

function tokenUtil(appId: string): string | null {
  const sesion = window.sessionStorage.getItem(claveTokenCavos(appId));
  if (sesion && tokenCavosVigente(sesion)) return sesion;
  const espejo = window.localStorage.getItem(claveEspejoToken(appId));
  if (espejo && tokenCavosVigente(espejo)) return espejo;
  return null;
}

function userIdDe(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(raw) as { userId?: unknown };
    return typeof json.userId === "string" && json.userId.trim() ? json.userId : null;
  } catch {
    return null;
  }
}

function userIdDeClaims(claims: Record<string, unknown> | null): string | null {
  if (!claims) return null;
  for (const clave of ["sub", "user_id", "uid"] as const) {
    const valor = claims[clave];
    if (typeof valor === "string" && valor.trim()) return valor;
  }
  return null;
}

export function claimsDeToken(token: string): Record<string, unknown> | null {
  const partes = token.split(".");
  if (partes.length < 2 || !partes[1]) return null;
  try {
    const json = JSON.parse(decodificar(partes[1])) as unknown;
    if (!json || typeof json !== "object") return null;
    return json as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decodificar(segmento: string): string {
  const b64 = segmento.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binario = atob(b64 + pad);
  const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
