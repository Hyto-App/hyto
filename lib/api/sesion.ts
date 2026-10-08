import { AVISO_SIN_CUENTA } from "@/lib/auth/errores";
import { intencionDe } from "@/lib/auth/intencion";
import type { Almacen } from "@/lib/db/almacen";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { AVISO_ENTRAR } from "@/lib/sesion/avisos";
import { COOKIE_SESION, encabezadoAlta, encabezadoCookie, encabezadoCookieCerrada, expiracion, leerCookie, segundosDeSesion, tokenSesion, vigente } from "@/lib/sesion/cookie";
import { correoDelToken, walletDeClaims, walletDelToken } from "@/lib/sesion/correo";
import { sesionEsDemo } from "@/lib/sesion/demo";
import { verificarJwt } from "@/lib/sesion/jwt";
import { emitirRetoWallet, firmaDesdeBase64, verificarPruebaWallet } from "@/lib/sesion/prueba-wallet";
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
    let usuario = await almacen.usuarioPorEmail(email);
    let nuevo = false;
    if (!usuario) {
      if (intencion === "signin") {
        return json({ aviso: AVISO_SIN_CUENTA }, 404);
      }
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
    const provisionar = intencion === "signup";
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

const AVISO_CUENTA = "That doesn't look like a payout account. Sign in again.";
const AVISO_DISTINTA = "That account doesn't match this sign-in. Sign in again.";
const AVISO_FIRMAR = "Sign this account to prove you control it.";
const AVISO_FIRMA = "That signature does not match this account. Sign in again.";
const AVISO_RETO = "This wallet check expired. Sign in again.";
const AVISO_SECRETO = "Wallet checks are not configured.";

export async function retoWalletHttp(request: Request, almacen: Almacen): Promise<Response> {
  const token = leerCookie(request, COOKIE_SESION);
  if (!token) return json({ aviso: AVISO_ENTRAR }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const crudo = body && typeof body === "object" ? (body as { wallet?: unknown }).wallet : undefined;
  if (typeof crudo !== "string" || !esCuenta(crudo.trim())) return json({ aviso: AVISO_CUENTA }, 400);
  const wallet = crudo.trim();
  try {
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return json({ aviso: AVISO_ENTRAR }, 401);
    const guardada = (sesion.wallet ?? "").trim();
    if (guardada && esCuenta(guardada) && guardada !== wallet) return json({ aviso: AVISO_DISTINTA }, 400);
    if (guardada === wallet) return json({ listo: true, wallet }, 200);
    const reto = emitirRetoWallet(token, wallet);
    if (!reto) return json({ aviso: AVISO_SECRETO }, 503);
    return json({ mensaje: reto.mensaje, token: reto.token }, 200);
  } catch {
    return baseNoLista();
  }
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
  const datos = body && typeof body === "object" ? (body as { wallet?: unknown; reto?: unknown; firma?: unknown; ingreso?: unknown; token?: unknown }) : {};
  const crudo = datos.wallet;
  if (typeof crudo !== "string" || !esCuenta(crudo.trim())) return json({ aviso: AVISO_CUENTA }, 400);
  const wallet = crudo.trim();
  try {
    const sesion = await almacen.leerSesion(token);
    if (!sesion || !vigente(sesion.expiraEn)) return json({ aviso: AVISO_ENTRAR }, 401);
    const guardada = (sesion.wallet ?? "").trim();
    if (guardada && esCuenta(guardada) && guardada !== wallet) return json({ aviso: AVISO_DISTINTA }, 400);
    if (guardada === wallet) return json({ wallet }, 200);
    const ingreso = texto(datos.ingreso) || texto(datos.token);
    if (ingreso) {
      const claims = await verificarJwt(ingreso);
      const nombrada = claims ? walletDeClaims(claims) : null;
      if (nombrada && nombrada !== wallet) return json({ aviso: AVISO_DISTINTA }, 400);
      if (nombrada === wallet) {
        await almacen.guardarWallet(token, wallet);
        return json({ wallet }, 200);
      }
    }
    const reto = texto(datos.reto);
    const firma = texto(datos.firma);
    if (!reto || !firma) return json({ aviso: AVISO_FIRMAR }, 400);
    const bytes = firmaDesdeBase64(firma);
    if (!bytes) return json({ aviso: AVISO_FIRMA }, 400);
    const prueba = verificarPruebaWallet(token, wallet, reto, bytes);
    if (!prueba.ok) {
      if (prueba.motivo === "secreto") return json({ aviso: AVISO_SECRETO }, 503);
      if (prueba.motivo === "vencido") return json({ aviso: AVISO_RETO }, 400);
      return json({ aviso: AVISO_FIRMA }, 400);
    }
    await almacen.guardarWallet(token, wallet);
    return json({ wallet }, 200);
  } catch {
    return baseNoLista();
  }
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}
