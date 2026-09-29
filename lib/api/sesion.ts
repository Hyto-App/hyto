import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { COOKIE_SESION, encabezadoCookie, expiracion, leerCookie, tokenSesion, vigente } from "@/lib/sesion/cookie";
import { correoDelToken, walletDelToken } from "@/lib/sesion/correo";
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
      wallet: walletDelToken(token) ?? "",
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
  const datos = body && typeof body === "object" ? (body as { wallet?: unknown; token?: unknown }) : {};
  const crudo = datos.wallet;
  if (typeof crudo !== "string" || !esCuenta(crudo.trim())) {
    return json({ aviso: "La wallet no es una cuenta de Stellar." }, 400);
  }
  try {
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return json({ aviso: "Entra para continuar." }, 401);
    const wallet = crudo.trim();
    // Límite: Cavos firma en el dispositivo y el JWT de login no trae la G….
    // Si ese token (o el que acompaña este pedido) sí trae una cuenta, tiene que ser esta.
    // Si no trae ninguna, se guarda la dirección que manda el cliente. Eso no prueba
    // que controle la clave. El envío no usa este texto como autorización:
    // la cuenta que firma tiene que salir del XDR.
    const tokenIngreso = typeof datos.token === "string" ? datos.token.trim() : "";
    const delIngreso = tokenIngreso ? walletDelToken(tokenIngreso) : null;
    if (delIngreso && delIngreso !== wallet) {
      return json({ aviso: "La wallet no es la de este ingreso." }, 400);
    }
    const guardada = (sesion.wallet ?? "").trim();
    if (guardada && esCuenta(guardada) && guardada !== wallet) {
      return json({ aviso: "La wallet no es la de este ingreso." }, 400);
    }
    await almacen.guardarWallet(token, wallet);
    return json({ wallet }, 200);
  } catch {
    return baseNoLista();
  }
}
