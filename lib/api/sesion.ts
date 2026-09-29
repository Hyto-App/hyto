import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { COOKIE_SESION, encabezadoCookie, expiracion, leerCookie, tokenSesion, vigente } from "@/lib/sesion/cookie";
import { correoDelToken } from "@/lib/sesion/correo";
import { baseNoLista, json } from "./json";

export async function crearSesionHttp(request: Request, almacen: Almacen): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "El cuerpo no es JSON." }, 400);
  }
  if (!body || typeof body !== "object") return json({ aviso: "Falta el correo." }, 400);
  const crudo = body as Record<string, unknown>;
  const pedido = typeof crudo.email === "string" ? crudo.email : "";
  const token = typeof crudo.token === "string" ? crudo.token.trim() : "";
  const correo = correoDelToken(token, pedido);
  if (!correo) return json({ aviso: "No se pudo confirmar el ingreso." }, 400);
  try {
    await asegurarSemilla(almacen);
    const usuario = await almacen.usuarioPorEmail(correo.correo);
    if (!usuario) return json({ aviso: "Este correo no está en el equipo." }, 403);
    const sesion = tokenSesion();
    await almacen.crearSesion({
      token: sesion,
      email: usuario.email,
      usuarioId: usuario.id,
      rol: usuario.rol,
      expiraEn: expiracion(),
      wallet: "",
    });
    return json(
      { email: usuario.email, rol: usuario.rol, usuarioId: usuario.id, nombre: usuario.nombre },
      200,
      { "set-cookie": encabezadoCookie(sesion) },
    );
  } catch {
    return baseNoLista();
  }
}

export async function fijarWalletHttp(request: Request, almacen: Almacen): Promise<Response> {
  const token = leerCookie(request, COOKIE_SESION);
  if (!token) return json({ aviso: "Entra para continuar." }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "El cuerpo no es JSON." }, 400);
  }
  const crudo = body && typeof body === "object" ? (body as { wallet?: unknown }).wallet : undefined;
  if (typeof crudo !== "string" || !esCuenta(crudo.trim())) {
    return json({ aviso: "La wallet no es una cuenta de Stellar." }, 400);
  }
  try {
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return json({ aviso: "Entra para continuar." }, 401);
    const wallet = crudo.trim();
    await almacen.guardarWallet(token, wallet);
    return json({ wallet }, 200);
  } catch {
    return baseNoLista();
  }
}
