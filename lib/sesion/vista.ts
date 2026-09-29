import { cookies } from "next/headers";
import { almacenNeon } from "@/lib/db/neon";
import { COOKIE_SESION, vigente } from "./cookie";
import { sesionEsDemo } from "./demo";

export async function leerModoDemo(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value?.trim();
  if (!token) return false;
  try {
    const almacen = await almacenNeon();
    if (!almacen) return false;
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return false;
    return sesionEsDemo(sesion);
  } catch {
    return false;
  }
}
