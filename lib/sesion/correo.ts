import { createHash } from "node:crypto";
import { esCuenta } from "@/lib/escrow/cuerpos";
import { verificarJwt, type AjustesJwt } from "./jwt";

export type CorreoToken = {
  correo: string;
  sub: string;
  exp: number | null;
};

const CLAVES_WALLET = ["wallet", "stellarAddress", "stellar_address", "address"];

export const EMISOR_APPLE = "https://appleid.apple.com";
/**
 * Apple can return a token without `email`. Hyto keys accounts on email, so that
 * person gets a stable address built from the verified `sub`. `.invalid` is
 * reserved (RFC 2606): no real inbox, no email code and no other provider can
 * ever claim it, so it cannot collide with an existing user.
 */
export const DOMINIO_APPLE_SIN_CORREO = "apple.hyto.invalid";

export async function correoDelToken(token: string, correoPedido: string, ajustes?: AjustesJwt): Promise<CorreoToken | null> {
  const claims = await verificarJwt(token, ajustes);
  if (!claims) return null;
  const sub = texto(claims.sub) || texto(claims.user_id) || texto(claims.uid);
  if (!sub) return null;
  let claim = texto(claims.email).toLowerCase();
  if (claim.endsWith(`@${DOMINIO_APPLE_SIN_CORREO}`)) return null;
  if (!claim.includes("@")) {
    if (!esApple(claims)) return null;
    claim = correoAppleSinCorreo(sub);
  }
  const pedido = correoPedido.trim().toLowerCase();
  if (pedido && pedido !== claim) return null;
  const exp = typeof claims.exp === "number" && Number.isFinite(claims.exp) ? claims.exp : null;
  return { correo: claim, sub, exp };
}

// Si el JWT del ingreso trae una G…, es la wallet de ese login.
// El token de Cavos que usa Hyto hoy no la trae: la G… la deriva el dispositivo.
// walletDelToken no comprueba la firma. Solo vale después de verificarJwt, o para leer un token que esa función ya aceptó.
export function walletDelToken(token: string): string | null {
  const partes = token.split(".");
  if (partes.length < 2 || !partes[1]) return null;
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  return walletDeClaims(json);
}

export function walletDeClaims(claims: unknown): string | null {
  return walletEn(claims, 0);
}

function walletEn(valor: unknown, profundidad: number): string | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor) || profundidad > 2) return null;
  const crudo = valor as Record<string, unknown>;
  for (const clave of CLAVES_WALLET) {
    const cuenta = texto(crudo[clave]);
    if (esCuenta(cuenta)) return cuenta;
  }
  for (const anidado of [crudo.identity, crudo.user]) {
    const hallada = walletEn(anidado, profundidad + 1);
    if (hallada) return hallada;
  }
  return null;
}

export function correoAppleSinCorreo(sub: string): string {
  const huella = createHash("sha256").update(`apple:${sub}`).digest("hex").slice(0, 32);
  return `apple-${huella}@${DOMINIO_APPLE_SIN_CORREO}`;
}

// Apple's own id_token, or a Firebase token minted from an Apple sign-in.
function esApple(claims: Record<string, unknown>): boolean {
  if (claims.iss === EMISOR_APPLE) return true;
  const firebase = claims.firebase;
  return Boolean(firebase && typeof firebase === "object" && (firebase as { sign_in_provider?: unknown }).sign_in_provider === "apple.com");
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}
