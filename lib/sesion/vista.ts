import { cookies } from "next/headers";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila } from "@/lib/db/tipos";
import { COOKIE_SESION, vigente } from "./cookie";
import { rolDemoDe, sesionEsDemo, type RolDemo } from "./demo";

export async function leerSesionActual(): Promise<SesionFila | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value?.trim();
  if (!token) return null;
  try {
    const almacen = await almacenNeon();
    if (!almacen) return null;
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return null;
    return { ...sesion, wallet: sesion.wallet ?? "" };
  } catch {
    return null;
  }
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
