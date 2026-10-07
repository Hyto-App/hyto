import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila } from "@/lib/db/tipos";
import { COOKIE_SESION, vigente } from "./cookie";
import { rolDemoDe, sesionEsDemo, type RolDemo } from "./demo";

export const leerSesionActual = cache(async (): Promise<SesionFila | null> => {
  // A deploy must not serve a cached signed-out page. The cookie is the Postgres key.
  await connection();
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value?.trim();
  if (!token) return null;
  let ultimo: unknown = null;
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      const almacen = await almacenNeon();
      if (!almacen) return null;
      const sesion = await almacen.leerSesion(token);
      if (!sesion || !vigente(sesion.expiraEn)) return null;
      return { ...sesion, wallet: sesion.wallet ?? "" };
    } catch (error) {
      ultimo = error;
    }
  }
  console.error("[sesion] could not read the session", ultimo instanceof Error ? ultimo.message : "error");
  return null;
});

export async function leerRolDemo(): Promise<RolDemo | null> {
  try {
    const sesion = await leerSesionActual();
    if (!sesion || !sesionEsDemo(sesion)) return null;
    return rolDemoDe(sesion.rol);
  } catch {
    return null;
  }
}

export async function leerModoDemo(): Promise<boolean> {
  return (await leerRolDemo()) !== null;
}
