import { baseNoLista, json, sinBase } from "@/lib/api/json";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila } from "@/lib/db/tipos";
import { COOKIE_SESION, leerCookie, vigente } from "./cookie";

export async function exigirSesion(request: Request): Promise<SesionFila | Response> {
  const token = leerCookie(request, COOKIE_SESION);
  if (!token) return json({ aviso: "Entra para continuar." }, 401);
  const almacen = await almacenNeon();
  if (!almacen) return sinBase();
  try {
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return json({ aviso: "Entra para continuar." }, 401);
    return sesion;
  } catch {
    return baseNoLista();
  }
}

export async function exigirOrganizador(request: Request, aviso = "Solo el organizador prepara el pago."): Promise<Response | null> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  if (sesion.rol !== "organizador") return json({ aviso }, 403);
  return null;
}
