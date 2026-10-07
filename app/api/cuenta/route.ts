import { conAlmacen } from "@/lib/api/base";
import { leerCuentaHttp } from "@/lib/api/cuenta";
import { exigirSesion } from "@/lib/sesion/exigir";
import { COOKIE_IDIOMA, idiomaDe } from "@/lib/ui/idioma";

export async function GET(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) return sesion;
  const cookie = request.headers.get("cookie") ?? "";
  const par = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE_IDIOMA}=`));
  const idioma = idiomaDe(par?.slice(COOKIE_IDIOMA.length + 1));
  return conAlmacen((almacen) => leerCuentaHttp(sesion, almacen, { idioma }));
}
