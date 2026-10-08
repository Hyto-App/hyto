import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { secretoPreparado, type EntornoSecreto } from "@/lib/api/preparado";

/**
 * Off-chain proof that this browser holds the Stellar key for the address it
 * registers. Cavos `signMessage` signs `prefixedMessageBytes(utf8(message))`
 * with the ed25519 control key (`Cavos Signed Message:\n<byte length>\n` plus
 * the message). Nothing is submitted, so an undeployed account can still prove
 * the key it already holds.
 */
export const PREFIJO_MENSAJE_CAVOS = "Cavos Signed Message:\n";
export const VIGENCIA_RETO_MS = 10 * 60 * 1000;

export type RetoWallet = {
  mensaje: string;
  token: string;
};

type CargaReto = {
  sesion: string;
  wallet: string;
  mensaje: string;
  exp: number;
};

export function bytesMensajeCavos(mensaje: string): Uint8Array {
  const cuerpo = new TextEncoder().encode(mensaje);
  const prefijo = new TextEncoder().encode(`${PREFIJO_MENSAJE_CAVOS}${cuerpo.length}\n`);
  const salida = new Uint8Array(prefijo.length + cuerpo.length);
  salida.set(prefijo, 0);
  salida.set(cuerpo, prefijo.length);
  return salida;
}

export function mensajeRetoWallet(wallet: string, nonce: string): string {
  return `Hyto confirms control of this Stellar account.\nAccount: ${wallet}\nNonce: ${nonce}`;
}

export function huellaSesion(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function emitirRetoWallet(
  sesion: string,
  wallet: string,
  ahora = Date.now(),
  env?: EntornoSecreto,
): RetoWallet | null {
  const secreto = secretoPreparado(env);
  if (!secreto) return null;
  const nonce = randomBytes(16).toString("base64url");
  const mensaje = mensajeRetoWallet(wallet, nonce);
  const carga: CargaReto = { sesion: huellaSesion(sesion), wallet, mensaje, exp: ahora + VIGENCIA_RETO_MS };
  return { mensaje, token: firmarCarga(carga, secreto) };
}

export type MotivoPrueba = "secreto" | "invalido" | "vencido" | "sesion" | "firma";

export function verificarPruebaWallet(
  sesion: string,
  wallet: string,
  token: string,
  firma: Uint8Array,
  ahora = Date.now(),
  env?: EntornoSecreto,
): { ok: true } | { ok: false; motivo: MotivoPrueba } {
  const secreto = secretoPreparado(env);
  if (!secreto) return { ok: false, motivo: "secreto" };
  const carga = leerCarga(token, secreto);
  if (!carga) return { ok: false, motivo: "invalido" };
  if (carga.exp <= ahora) return { ok: false, motivo: "vencido" };
  if (carga.sesion !== huellaSesion(sesion) || carga.wallet !== wallet) return { ok: false, motivo: "sesion" };
  if (!firmaDeCuenta(wallet, carga.mensaje, firma)) return { ok: false, motivo: "firma" };
  return { ok: true };
}

export function firmaDeCuenta(wallet: string, mensaje: string, firma: Uint8Array): boolean {
  if (firma.length !== 64) return false;
  try {
    return Keypair.fromPublicKey(wallet).verify(Buffer.from(bytesMensajeCavos(mensaje)), Buffer.from(firma));
  } catch {
    return false;
  }
}

export function firmaDesdeBase64(valor: string): Uint8Array | null {
  const limpio = valor.trim();
  if (!limpio || limpio.length > 200) return null;
  try {
    const bytes = Buffer.from(limpio, "base64");
    if (!bytes.length || Buffer.from(bytes).toString("base64").replace(/=+$/, "") !== limpio.replace(/=+$/, "")) return null;
    return new Uint8Array(bytes);
  } catch {
    return null;
  }
}

function firmarCarga(carga: CargaReto, secreto: string): string {
  const cuerpo = Buffer.from(JSON.stringify(carga)).toString("base64url");
  const mac = createHmac("sha256", secreto).update(cuerpo).digest("base64url");
  return `${cuerpo}.${mac}`;
}

function leerCarga(token: string, secreto: string): CargaReto | null {
  const partes = token.split(".");
  if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
  const mac = createHmac("sha256", secreto).update(partes[0]).digest("base64url");
  const esperada = Buffer.from(mac);
  const recibida = Buffer.from(partes[1]);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  try {
    const json = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8")) as unknown;
    if (!cargaValida(json)) return null;
    return json;
  } catch {
    return null;
  }
}

function cargaValida(valor: unknown): valor is CargaReto {
  if (!valor || typeof valor !== "object") return false;
  const datos = valor as Record<string, unknown>;
  return (
    typeof datos.sesion === "string" &&
    typeof datos.wallet === "string" &&
    typeof datos.mensaje === "string" &&
    datos.mensaje.includes(`Account: ${datos.wallet}\n`) &&
    typeof datos.exp === "number" &&
    Number.isFinite(datos.exp)
  );
}
