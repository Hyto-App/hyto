import { enProduccion } from "@/lib/config/entorno";

export const COOKIE_SESION = "hyto_sesion";
export const TOPE_SESION_SEGUNDOS = 24 * 60 * 60;
export const SESION_SIN_EXP_SEGUNDOS = 8 * 60 * 60;

export function tokenSesion(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID().replace(/-/g, "")}`;
}

export function segundosDeSesion(exp: unknown, ahoraMs = Date.now()): number {
  if (typeof exp !== "number" || !Number.isFinite(exp)) return SESION_SIN_EXP_SEGUNDOS;
  const restante = Math.floor(exp - ahoraMs / 1000);
  if (restante < 1) return 1;
  return Math.min(restante, TOPE_SESION_SEGUNDOS);
}

export function encabezadoCookie(token: string, segundos = SESION_SIN_EXP_SEGUNDOS): string {
  const segura = enProduccion() ? "; Secure" : "";
  return `${COOKIE_SESION}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${acotar(segundos)}${segura}`;
}

export function encabezadoCookieCerrada(): string {
  const segura = enProduccion() ? "; Secure" : "";
  return `${COOKIE_SESION}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${segura}`;
}

export function leerCookie(request: Request, nombre: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const parte of header.split(";")) {
    const [clave, ...resto] = parte.trim().split("=");
    if (clave !== nombre) continue;
    const valor = resto.join("=").trim();
    if (!valor) return null;
    try {
      return decodeURIComponent(valor);
    } catch {
      return valor;
    }
  }
  return null;
}

export function expiracion(segundos = SESION_SIN_EXP_SEGUNDOS, ahoraMs = Date.now()): string {
  return new Date(ahoraMs + acotar(segundos) * 1000).toISOString();
}

function acotar(segundos: number): number {
  const entero = Math.floor(segundos);
  if (!Number.isFinite(entero) || entero < 1) return 1;
  return Math.min(entero, TOPE_SESION_SEGUNDOS);
}

export function vigente(expiraEn: string): boolean {
  const momento = Date.parse(expiraEn);
  return Number.isFinite(momento) && momento > Date.now();
}
