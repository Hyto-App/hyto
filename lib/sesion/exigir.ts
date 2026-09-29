import { baseNoLista, json, sinBase } from "@/lib/api/json";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila } from "@/lib/db/tipos";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { COOKIE_SESION, leerCookie, vigente } from "./cookie";

export async function exigirSesion(request: Request): Promise<SesionFila | Response> {
  const token = leerCookie(request, COOKIE_SESION);
  if (!token) return json({ aviso: "Entra para continuar." }, 401);
  const almacen = await almacenNeon();
  if (!almacen) return sinBase();
  try {
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return json({ aviso: "Entra para continuar." }, 401);
    return { ...sesion, wallet: sesion.wallet ?? "" };
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

// resolve-dispute lo firma disputeResolver. Esa cuenta no es la del organizador.
// Si la wallet de esta sesión no es firmante, no se arma ni se envía el XDR.
export function avisoSesionResolutor(sesion: { wallet?: string }, firmante: string): string | null {
  const wallet = (sesion.wallet ?? "").trim();
  if (!wallet || !esCuenta(wallet)) {
    return "Esta sesión no puede resolver la disputa. Entrá con la wallet del resolutor; firmante tiene que ser esa cuenta.";
  }
  if (wallet !== firmante) {
    return "firmante tiene que ser la wallet de esta sesión. El XDR lo firma el resolutor, no otra cuenta.";
  }
  return null;
}
