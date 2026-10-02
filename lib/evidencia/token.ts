import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { secretoPreparado, type EntornoSecreto } from "@/lib/api/preparado";

export const VIGENCIA_EVIDENCIA_MS = 2 * 60 * 1000;

export type CargaTokenEvidencia = {
  usuarioId: string;
  tareaId: string;
  jti: string;
  iat: number;
  exp: number;
};

export type FalloTokenEvidencia = "secreto" | "invalido" | "vencido" | "reusado" | "tarea" | "usuario";

const usados = new Map<string, number>();

export function reiniciarTokensEvidencia(): void {
  usados.clear();
}

export function emitirTokenEvidencia(
  carga: { usuarioId: string; tareaId: string },
  ahora = Date.now(),
  env?: EntornoSecreto,
): string | null {
  const secreto = secretoPreparado(env);
  if (!secreto) return null;
  const completa: CargaTokenEvidencia = {
    usuarioId: carga.usuarioId,
    tareaId: carga.tareaId,
    jti: randomUUID(),
    iat: ahora,
    exp: ahora + VIGENCIA_EVIDENCIA_MS,
  };
  return firmar(completa, secreto);
}

export function consumirTokenEvidencia(
  token: string,
  esperado: { usuarioId: string | null; tareaId: string },
  ahora = Date.now(),
  env?: EntornoSecreto,
): { ok: true; carga: CargaTokenEvidencia } | { ok: false; codigo: FalloTokenEvidencia } {
  const secreto = secretoPreparado(env);
  if (!secreto) return { ok: false, codigo: "secreto" };
  const carga = leer(token, secreto);
  if (!carga) return { ok: false, codigo: "invalido" };
  if (carga.exp <= ahora) return { ok: false, codigo: "vencido" };
  if (carga.tareaId !== esperado.tareaId) return { ok: false, codigo: "tarea" };
  if (esperado.usuarioId && carga.usuarioId !== esperado.usuarioId) return { ok: false, codigo: "usuario" };
  limpiar(ahora);
  if (usados.has(carga.jti)) return { ok: false, codigo: "reusado" };
  usados.set(carga.jti, carga.exp);
  return { ok: true, carga };
}

function firmar(carga: CargaTokenEvidencia, secreto: string): string {
  const cuerpo = Buffer.from(JSON.stringify(carga)).toString("base64url");
  const mac = createHmac("sha256", secreto).update(canonico(carga)).digest("base64url");
  return `${cuerpo}.${mac}`;
}

function leer(token: string, secreto: string): CargaTokenEvidencia | null {
  const partes = token.split(".");
  if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
  let carga: unknown;
  try {
    carga = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!cargaValida(carga)) return null;
  const mac = createHmac("sha256", secreto).update(canonico(carga)).digest("base64url");
  const firma = Buffer.from(mac);
  const recibida = Buffer.from(partes[1]);
  if (firma.length !== recibida.length || !timingSafeEqual(firma, recibida)) return null;
  return carga;
}

function canonico(carga: CargaTokenEvidencia): string {
  return [carga.usuarioId, carga.tareaId, carga.jti, String(carga.iat), String(carga.exp)].join("\n");
}

function cargaValida(valor: unknown): valor is CargaTokenEvidencia {
  if (!valor || typeof valor !== "object") return false;
  const datos = valor as Record<string, unknown>;
  return (
    typeof datos.usuarioId === "string" &&
    typeof datos.tareaId === "string" &&
    typeof datos.jti === "string" &&
    typeof datos.iat === "number" &&
    typeof datos.exp === "number" &&
    Number.isFinite(datos.iat) &&
    Number.isFinite(datos.exp)
  );
}

function limpiar(ahora: number): void {
  for (const [jti, exp] of usados) {
    if (exp <= ahora) usados.delete(jti);
  }
}
