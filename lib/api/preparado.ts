import { createHmac, timingSafeEqual } from "node:crypto";

export const VIGENCIA_PREPARADO_MS = 10 * 60 * 1000;

export type CargaPreparado = {
  usuarioId: string;
  sesionId: string;
  huella: string;
  accion: string;
  tareaId: string;
  monto: string;
  exp: number;
};

export type FalloPreparado = "secreto" | "invalido" | "vencido" | "sesion" | "huella";

type EntornoSecreto = { TRUSTLESS_API_KEY?: string; HYTO_TEST_SESSION_KEY?: string };

function entornoDe(env?: EntornoSecreto): EntornoSecreto {
  if (env) return env;
  return {
    TRUSTLESS_API_KEY: process.env.TRUSTLESS_API_KEY,
    HYTO_TEST_SESSION_KEY: process.env.HYTO_TEST_SESSION_KEY,
  };
}

export function secretoPreparado(env?: EntornoSecreto): string | null {
  const fuente = entornoDe(env);
  const clave = fuente.TRUSTLESS_API_KEY?.trim() || fuente.HYTO_TEST_SESSION_KEY?.trim() || "";
  return clave || null;
}

function canonico(carga: CargaPreparado): string {
  return [carga.usuarioId, carga.sesionId, carga.huella, carga.accion, carga.tareaId, carga.monto, String(carga.exp)].join("\n");
}

function cargaValida(valor: unknown): valor is CargaPreparado {
  if (!valor || typeof valor !== "object") return false;
  const datos = valor as Record<string, unknown>;
  return (
    typeof datos.usuarioId === "string" &&
    typeof datos.sesionId === "string" &&
    typeof datos.huella === "string" &&
    typeof datos.accion === "string" &&
    typeof datos.tareaId === "string" &&
    typeof datos.monto === "string" &&
    typeof datos.exp === "number" &&
    Number.isFinite(datos.exp)
  );
}

export function emitirTokenPreparado(
  carga: Omit<CargaPreparado, "exp"> & { exp?: number },
  ahora = Date.now(),
  env?: EntornoSecreto,
): string | null {
  const secreto = secretoPreparado(env);
  if (!secreto) return null;
  const completa: CargaPreparado = { ...carga, exp: carga.exp ?? ahora + VIGENCIA_PREPARADO_MS };
  const cuerpo = Buffer.from(JSON.stringify(completa)).toString("base64url");
  const mac = createHmac("sha256", secreto).update(canonico(completa)).digest("base64url");
  return `${cuerpo}.${mac}`;
}

export function verificarTokenPreparado(
  token: string,
  esperado: { usuarioId: string; sesionId: string; huella: string },
  ahora = Date.now(),
  env?: EntornoSecreto,
): { ok: true; carga: CargaPreparado } | { ok: false; codigo: FalloPreparado } {
  const secreto = secretoPreparado(env);
  if (!secreto) return { ok: false, codigo: "secreto" };
  const partes = token.split(".");
  if (partes.length !== 2 || !partes[0] || !partes[1]) return { ok: false, codigo: "invalido" };
  let carga: unknown;
  try {
    carga = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8"));
  } catch {
    return { ok: false, codigo: "invalido" };
  }
  if (!cargaValida(carga)) return { ok: false, codigo: "invalido" };
  const mac = createHmac("sha256", secreto).update(canonico(carga)).digest("base64url");
  const firma = Buffer.from(mac);
  const recibida = Buffer.from(partes[1]);
  if (firma.length !== recibida.length || !timingSafeEqual(firma, recibida)) return { ok: false, codigo: "invalido" };
  if (carga.exp <= ahora) return { ok: false, codigo: "vencido" };
  if (carga.usuarioId !== esperado.usuarioId || carga.sesionId !== esperado.sesionId) return { ok: false, codigo: "sesion" };
  if (carga.huella !== esperado.huella) return { ok: false, codigo: "huella" };
  return { ok: true, carga };
}
