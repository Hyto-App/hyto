import { intencionDe } from "@/lib/auth/intencion";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { AVISO_ENTRAR } from "@/lib/sesion/avisos";
import { COOKIE_SESION, encabezadoAlta, encabezadoCookie, encabezadoCookieCerrada, expiracion, leerCookie, segundosDeSesion, tokenSesion, vigente } from "@/lib/sesion/cookie";
import { correoDelToken, walletDelToken } from "@/lib/sesion/correo";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { baseNoLista, json, jsonCookies } from "./json";

const PRIVADA = { "cache-control": "private, no-store" };

export async function leerSesionHttp(request: Request, almacen: Almacen): Promise<Response> {
  const token = leerCookie(request, COOKIE_SESION);
  if (!token) return json({ aviso: AVISO_ENTRAR }, 401, PRIVADA);
  try {
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return json({ aviso: AVISO_ENTRAR }, 401, PRIVADA);
    return json({ ok: true, rol: sesion.rol, demo: sesionEsDemo(sesion) }, 200, PRIVADA);
  } catch {
    return baseNoLista();
  }
}

export async function crearSesionHttp(request: Request, almacen: Almacen): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  if (!body || typeof body !== "object") return json({ aviso: "The email is missing." }, 400);
  const crudo = body as Record<string, unknown>;
  const pedido = typeof crudo.email === "string" ? crudo.email : "";
  const token = typeof crudo.token === "string" ? crudo.token.trim() : "";
  const intencion = intencionDe(crudo.intencion);
  if (crudo.intencion !== undefined && !intencion) return json({ aviso: "Choose Sign up or Sign in." }, 400);
  const correo = await correoDelToken(token, pedido);
  if (!correo) {
    // Reason only: never log the token or the email.
    // An empty email is valid (Apple can omit it); the token decides.
    const motivo = !token ? "missing token" : "token rejected (signature, expiry, issuer, audience, or email missing/mismatch)";
    console.warn(`[api/sesion] Could not confirm sign-in: ${motivo}`);
    return json({ aviso: "Could not confirm sign-in." }, 400);
  }
  try {
    const email = correo.correo.trim().toLowerCase();
    // A returning user does not need the sample data to sign in. Seeding costs 11 to 29
    // sequential queries, which was most of the ~1.3 s this route took. It still runs when
    // the email is unknown, so a seeded identity on an empty database resolves as before,
    // and every route that reads sample data seeds on its own.
    let usuario = await almacen.usuarioPorEmail(email);
    let nuevo = false;
    // Sign in and Sign up both open an account the first time an email arrives.
    if (!usuario) {
      await asegurarSemilla(almacen);
      usuario = await almacen.usuarioPorEmail(email);
    }
    if (!usuario) {
      const local = email.split("@")[0] ?? "";
      await almacen.insertarUsuario({
        id: `u-${crypto.randomUUID()}`,
        email,
        nombre: local || email,
        rol: "voluntario",
      });
      usuario = await almacen.usuarioPorEmail(email);
      nuevo = true;
    }
    if (!usuario) throw new Error("Could not register the user.");
    const segundos = segundosDeSesion(correo.exp);
    const sesion = tokenSesion();
    await almacen.crearSesion({
      token: sesion,
      email: usuario.email,
      usuarioId: usuario.id,
      rol: usuario.rol,
      expiraEn: expiracion(segundos),
      wallet: walletDelToken(token) ?? "",
    });
    const provisionar = intencion === "signup" || nuevo;
    const cookies = [encabezadoCookie(sesion, segundos)];
    if (provisionar) cookies.push(encabezadoAlta(true));
    else if (intencion === "signin") cookies.push(encabezadoAlta(false));
    return jsonCookies(
      { email: usuario.email, rol: usuario.rol, usuarioId: usuario.id, nombre: usuario.nombre, nuevo, provisionar },
      200,
      cookies,
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
    return jsonCookies({ aviso: "Could not sign out." }, 503, [encabezadoCookieCerrada(), encabezadoAlta(false)]);
  }
  return jsonCookies({ ok: true }, 200, [encabezadoCookieCerrada(), encabezadoAlta(false)]);
}

export async function fijarWalletHttp(request: Request, almacen: Almacen): Promise<Response> {
  const token = leerCookie(request, COOKIE_SESION);
  if (!token) return json({ aviso: AVISO_ENTRAR }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const datos = body && typeof body === "object" ? (body as { wallet?: unknown; token?: unknown }) : {};
  const crudo = datos.wallet;
  if (typeof crudo !== "string" || !esCuenta(crudo.trim())) {
    return json({ aviso: "That doesn't look like a payout account. Sign in again." }, 400);
  }
  try {
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return json({ aviso: AVISO_ENTRAR }, 401);
    const wallet = crudo.trim();
    // Límite: Cavos firma en el dispositivo y el JWT de login no trae la G….
    // Si ese token (o el que acompaña este pedido) sí trae una cuenta, tiene que ser esta.
    // Si no trae ninguna, se guarda la dirección que manda el cliente. Eso no prueba
    // que controle la clave. El envío no usa este texto como autorización:
    // la cuenta que firma tiene que salir del XDR.
    const tokenIngreso = typeof datos.token === "string" ? datos.token.trim() : "";
    const delIngreso = tokenIngreso ? walletDelToken(tokenIngreso) : null;
    if (delIngreso && delIngreso !== wallet) {
      return json({ aviso: "That account doesn't match this sign-in. Sign in again." }, 400);
    }
    const guardada = (sesion.wallet ?? "").trim();
    if (guardada && esCuenta(guardada) && guardada !== wallet) {
      return json({ aviso: "That account doesn't match this sign-in. Sign in again." }, 400);
    }
    await almacen.guardarWallet(token, wallet);
    return json({ wallet }, 200);
  } catch {
    return baseNoLista();
  }
}
