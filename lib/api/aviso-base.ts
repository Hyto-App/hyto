/**
 * User-facing database failures. The four cases stay distinct so a missing
 * migration is not reported as a dead connection, and a missing DATABASE_URL
 * is not reported as either.
 */

export const AVISO_BASE_ESQUEMA = "The database is missing a migration.";
export const AVISO_BASE_CONEXION = "The database could not be reached.";
export const AVISO_BASE_CONFIG = "The database is not configured.";
export const AVISO_BASE_OTRA = "The database returned an error.";

export type ClaseBase = "esquema" | "conexion" | "configuracion" | "base";

export type FalloBase = { clase: ClaseBase; aviso: string; status: 503 };

const CODIGOS_ESQUEMA = new Set(["42703", "42P01"]);

const CODIGOS_CONEXION = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "53300",
  "57P01",
  "57P02",
  "57P03",
  "28P01",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
]);

/** Other SQLSTATE values that mean the database answered, but not about a missing column. */
const CODIGOS_OTRA_BASE = new Set(["3D000"]);

export function clasificarFalloBase(error: unknown): FalloBase | null {
  const codigo = codigoDe(error);
  const mensaje = mensajeDe(error);
  if (/database is not configured/i.test(mensaje)) {
    return { clase: "configuracion", aviso: AVISO_BASE_CONFIG, status: 503 };
  }
  if (CODIGOS_ESQUEMA.has(codigo) || esEsquema(mensaje)) {
    return { clase: "esquema", aviso: AVISO_BASE_ESQUEMA, status: 503 };
  }
  if (CODIGOS_CONEXION.has(codigo) || esConexion(mensaje)) {
    return { clase: "conexion", aviso: AVISO_BASE_CONEXION, status: 503 };
  }
  if (CODIGOS_OTRA_BASE.has(codigo) || /^[0-9A-Z]{5}$/.test(codigo)) {
    return { clase: "base", aviso: AVISO_BASE_OTRA, status: 503 };
  }
  return null;
}

/** Log line. Connection strings, passwords, and emails stay out. */
export function detalleErrorBase(error: unknown): string {
  const nombre = error instanceof Error ? error.name : typeof error;
  const codigo = codigoDe(error);
  const mensaje = redactar(mensajeDe(error)).slice(0, 400);
  return `${nombre}${codigo ? ` ${codigo}` : ""}: ${mensaje}`;
}

export function codigoDe(error: unknown): string {
  const visto = new Set<unknown>();
  let actual: unknown = error;
  while (actual && typeof actual === "object" && !visto.has(actual)) {
    visto.add(actual);
    const codigo = (actual as { code?: unknown }).code;
    if (typeof codigo === "string" && codigo) return codigo;
    actual = (actual as { cause?: unknown }).cause;
  }
  return "";
}

function mensajeDe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function esEsquema(mensaje: string): boolean {
  return /column\s+.+\s+does not exist|relation\s+.+\s+does not exist|undefined column|undefined table/i.test(mensaje);
}

function esConexion(mensaje: string): boolean {
  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|connection (terminated|refused|timeout)|password authentication failed|remaining connection slots|Client has encountered a connection error/i.test(
    mensaje,
  );
}

function redactar(texto: string): string {
  return texto
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/(password|secret|token|api[_-]?key|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}
