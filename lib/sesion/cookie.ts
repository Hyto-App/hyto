export const COOKIE_SESION = "hyto_sesion";
const SEGUNDOS = 14 * 24 * 60 * 60;

export function tokenSesion(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID().replace(/-/g, "")}`;
}

export function encabezadoCookie(token: string): string {
  const segura = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_SESION}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SEGUNDOS}${segura}`;
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

export function expiracion(): string {
  return new Date(Date.now() + SEGUNDOS * 1000).toISOString();
}

export function vigente(expiraEn: string): boolean {
  const momento = Date.parse(expiraEn);
  return Number.isFinite(momento) && momento > Date.now();
}
