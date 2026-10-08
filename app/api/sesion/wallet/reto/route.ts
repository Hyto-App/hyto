import { conAlmacen } from "@/lib/api/base";
import { retoWalletHttp } from "@/lib/api/sesion";
import { json } from "@/lib/api/json";
import { COOKIE_SESION, leerCookie } from "@/lib/sesion/cookie";

export async function POST(request: Request): Promise<Response> {
  if (!leerCookie(request, COOKIE_SESION)) return json({ aviso: "Sign in to continue." }, 401);
  return conAlmacen((almacen) => retoWalletHttp(request, almacen));
}
