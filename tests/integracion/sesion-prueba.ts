import { createHmac, timingSafeEqual } from "node:crypto";
import type { Rol } from "../../lib/db/tipos";
import { IDENTIDADES } from "../../lib/integrante/identidades";
import { COOKIE_SESION, encabezadoCookie, expiracion, tokenSesion } from "../../lib/sesion/cookie";
import { almacenDePrueba } from "./postgres";

/**
 * Clave solo de pruebas. No es un secreto de Neon, Blob ni Cavos.
 * La cookie sigue el código de sesión de la app (`tokenSesion` + `encabezadoCookie`
 * + `crearSesion`). El MAC queda en el mismo token que se guarda: hoy la app lo
 * trata como opaco y, si más adelante verifica la firma, `macValida` es el punto
 * donde se comprueba con `HYTO_TEST_SESSION_KEY` o esta clave.
 */
export const CLAVE_SESION_PRUEBA = "hyto-prueba-sesion-local";

export function claveSesionPrueba(env: NodeJS.ProcessEnv = process.env): string {
  const pedido = env.HYTO_TEST_SESSION_KEY?.trim();
  return pedido || CLAVE_SESION_PRUEBA;
}

export function firmarTokenPrueba(token: string, clave = claveSesionPrueba()): string {
  const mac = createHmac("sha256", clave).update(token).digest("base64url");
  return `${token}.${mac}`;
}

export function macValida(firmado: string, clave = claveSesionPrueba()): boolean {
  const corte = firmado.lastIndexOf(".");
  if (corte <= 0) return false;
  const token = firmado.slice(0, corte);
  const mac = firmado.slice(corte + 1);
  const esperado = createHmac("sha256", clave).update(token).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function cookieDesdeToken(tokenFirmado: string): string {
  const par = encabezadoCookie(tokenFirmado).split(";")[0]?.trim() ?? "";
  if (!par.startsWith(`${COOKIE_SESION}=`)) throw new Error("No se pudo armar la cookie de sesión.");
  return par;
}

export async function cookieSesionPrueba(rol: Rol = "organizador"): Promise<string> {
  const identidad = IDENTIDADES.find((item) => item.id === (rol === "organizador" ? "organizador" : "voluntario-1"));
  if (!identidad) throw new Error("No hay identidad de prueba.");
  const token = firmarTokenPrueba(tokenSesion());
  await almacenDePrueba().crearSesion({
    token,
    email: identidad.email,
    usuarioId: identidad.id,
    rol,
    expiraEn: expiracion(),
  });
  return cookieDesdeToken(token);
}
