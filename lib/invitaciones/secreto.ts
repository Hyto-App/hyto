import { createHash, randomBytes } from "node:crypto";
import type { InvitacionFila, MotivoInvitacion } from "@/lib/db/tipos";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const DIAS_INVITACION = 7;
export const MAX_USOS_CODIGO = 50;

export function normalizarSecreto(secreto: string): string {
  const limpio = secreto.trim();
  if (/^[A-Za-z0-9]{6,12}$/.test(limpio)) return limpio.toUpperCase();
  return limpio;
}

export function hashSecreto(secreto: string): string {
  return createHash("sha256").update(normalizarSecreto(secreto)).digest("hex");
}

export function codigoHumano(largo = 8): string {
  const bytes = randomBytes(largo);
  let salida = "";
  for (let i = 0; i < largo; i += 1) salida += ALFABETO[bytes[i]! % ALFABETO.length];
  return salida;
}

export function secretoDirecto(): string {
  return randomBytes(24).toString("base64url");
}

export function expiraEnDias(dias: number, desde = new Date()): string {
  return new Date(desde.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();
}

export function motivoInvitacion(invitacion: InvitacionFila | null, email: string, ahora: string): MotivoInvitacion | null {
  if (!invitacion) return "missing";
  if (invitacion.expiraEn && invitacion.expiraEn <= ahora) return "expired";
  if (invitacion.usos >= invitacion.maxUsos) return "used";
  if (invitacion.tipo === "direct" && (invitacion.email ?? "").trim().toLowerCase() !== email.trim().toLowerCase()) return "email";
  return null;
}
