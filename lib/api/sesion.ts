import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { COOKIE_SESION, encabezadoCookie, encabezadoCookieCerrada, expiracion, leerCookie, tokenSesion, vigente } from "@/lib/sesion/cookie";
import { correoDelToken, walletDelToken } from "@/lib/sesion/correo";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { baseNoLista, json } from "./json";

export async function leerSesionHttp(request: Request, almacen: Almacen): Promise<Response> {
  const token = leerCookie(request, COOKIE_SESION);
  if (!token) return json({ aviso: "Sign in to continue." }, 401);
  try {
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return json({ aviso: "Sign in to continue." }, 401);
    return json({ ok: true, rol: sesion.rol, demo: sesionEsDemo(sesion) });
  } catch {
    return baseNoLista();
  }
}

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
  const correo = await correoDelToken(token, pedido);
  if (!correo) return json({ aviso: "No se pudo confirmar el ingreso." }, 400);
  try {
    await asegurarSemilla(almacen);
    const email = correo.correo.trim().toLowerCase();
    let usuario = await almacen.usuarioPorEmail(email);
    if (!usuario) {
      const local = email.split("@")[0] ?? "";
      await almacen.insertarUsuario({
        id: `u-${crypto.randomUUID()}`,
        email,
        nombre: local || email,
        rol: "voluntario",
      });
      usuario = await almacen.usuarioPorEmail(email);
    }
    if (!usuario) throw new Error("No se pudo registrar el usuario.");
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

export async function cerrarSesionHttp(request: Request, almacen: Almacen): Promise<Response> {
  const token = leerCookie(request, COOKIE_SESION);
  try {
    if (token) await almacen.borrarSesion(token);
  } catch {
    return json({ aviso: "No se pudo cerrar la sesión." }, 503, { "set-cookie": encabezadoCookieCerrada() });
  }
  return json({ ok: true }, 200, { "set-cookie": encabezadoCookieCerrada() });
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
