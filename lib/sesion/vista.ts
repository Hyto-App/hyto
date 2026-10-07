import { cookies } from "next/headers";
import { connection } from "next/server";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila } from "@/lib/db/tipos";
import { COOKIE_SESION, vigente } from "./cookie";
import { rolDemoDe, sesionEsDemo, type RolDemo } from "./demo";
import type { ErrorSesionUrl } from "./retorno";

/** `base`: the cookie is there but the database could not be read, so the person may still be signed in. */
export type LecturaSesion = { sesion: SesionFila | null; error: ErrorSesionUrl | null };

export async function leerSesionActual(): Promise<SesionFila | null> {
  return (await leerSesionConEstado()).sesion;
}

export async function leerSesionConEstado(): Promise<LecturaSesion> {
  // A deploy must not serve a cached signed-out page. The cookie is the Postgres key.
  await connection();
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value?.trim();
  if (!token) return { sesion: null, error: null };
  let ultimo: unknown = null;
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      const almacen = await almacenNeon();
      if (!almacen) {
        console.error("[sesion] could not read the session: database not configured");
        return { sesion: null, error: "base" };
      }
      const sesion = await almacen.leerSesion(token);
      if (!sesion || !vigente(sesion.expiraEn)) return { sesion: null, error: null };
      return { sesion: { ...sesion, wallet: sesion.wallet ?? "" }, error: null };
    } catch (error) {
      ultimo = error;
    }
  }
  console.error("[sesion] could not read the session", ultimo instanceof Error ? ultimo.message : "error");
  return { sesion: null, error: "base" };
}

export async function leerRolDemo(): Promise<RolDemo | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value?.trim();
  if (!token) return null;
  try {
    const almacen = await almacenNeon();
    if (!almacen) return null;
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn) || !sesionEsDemo(sesion)) return null;
    return rolDemoDe(sesion.rol);
  } catch {
    return null;
  }
}

export async function leerModoDemo(): Promise<boolean> {
  return (await leerRolDemo()) !== null;
}
