import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";

/**
 * La doc de Cavos (https://docs.cavos.xyz) no publica JWKS, emisor ni audience.
 * Sin `CAVOS_JWT_JWK` y sin `CAVOS_JWKS_URL` no hay sesión: la firma no se puede
 * comprobar. `CAVOS_JWT_ISSUER` acepta varios emisores separados por coma
 * (el OTP de Cavos y Google). Cada JWK puede traer `iss`, o el JSON puede ser
 * un objeto cuyas claves son esos emisores. El `kid` elige la clave dentro
 * del emisor. `CAVOS_JWKS_URL` acepta varias URLs https separadas por coma,
 * en el mismo orden que los emisores cuando hay más de una. No hay URLs por
 * defecto.
 */
export const HOLGURA_JWT_SEGUNDOS = 60;

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { hasta: number; claves: JsonWebKey[] }>();

export type ClaveJwt = JsonWebKey & { iss?: string };

export type AjustesJwt = {
  ahora?: number;
  /** `null` no comprueba `iss`. Ausente: se lee `CAVOS_JWT_ISSUER` (lista separada por coma). */
  emisor?: string | string[] | null;
  /** `null` no comprueba `aud`. Ausente: se lee `CAVOS_JWT_AUDIENCE` (lista separada por coma). */
  audiencia?: string | string[] | null;
  /** Ausente: se lee el entorno. Arreglo vacío: hay verificación y ninguna clave sirve. */
  claves?: ClaveJwt[];
  /** `null` no descarga JWKS. Ausente: se lee `CAVOS_JWKS_URL` (lista separada por coma). */
  jwksUrl?: string | string[] | null;
};

type Clave = {
  jwk: JsonWebKey;
  iss: string | null;
};

type FuenteJwks = {
  url: string;
  iss: string | null;
};

type Ajustes = {
  ahora: number;
  emisores: string[] | null;
  audiencia: string[] | null;
  claves?: ClaveJwt[];
  jwks: FuenteJwks[];
};

export async function verificarJwt(token: string, parcial?: AjustesJwt): Promise<Record<string, unknown> | null> {
  try {
    return await comprobar(token, resolver(parcial));
  } catch {
    return null;
  }
}

async function comprobar(token: string, ajustes: Ajustes): Promise<Record<string, unknown> | null> {
  if (!token || token.length > 16_000) return null;
  const partes = token.split(".");
  if (partes.length !== 3 || !partes[0] || !partes[1] || !partes[2]) return null;
  const claims = leerParte(partes[1]);
  if (!claims) return null;
  const claves = await clavesEfectivas(ajustes);
  if (claves === null) return null;
  const encabezado = leerParte(partes[0]);
  if (!encabezado || encabezado.alg !== "RS256" || "crit" in encabezado) return null;
  const kid = typeof encabezado.kid === "string" ? encabezado.kid : null;
  const iss = typeof claims.iss === "string" ? claims.iss : null;
  if (ajustes.emisores && (!iss || !ajustes.emisores.includes(iss))) return null;
  const elegidas = elegir(claves, kid, iss);
  if (!elegidas.length || !firmaValida(partes[0], partes[1], partes[2], elegidas)) return null;
  if (!tiempos(claims, ajustes.ahora)) return null;
  if (ajustes.audiencia && !audCoincide(claims.aud, ajustes.audiencia)) return null;
  return claims;
}

function resolver(parcial?: AjustesJwt): Ajustes {
  const emisores = emisoresDe(parcial);
  const jwksValor =
    parcial && parcial.jwksUrl !== undefined ? unirLista(parcial.jwksUrl) : textoEnv(process.env.CAVOS_JWKS_URL);
  return {
    ahora: parcial?.ahora ?? Date.now(),
    emisores,
    audiencia: audienciasDe(parcial),
    claves: parcial?.claves,
    jwks: fuentesJwks(jwksValor, emisores),
  };
}

async function clavesEfectivas(ajustes: Ajustes): Promise<Clave[] | null> {
  if (ajustes.claves !== undefined) return ajustes.claves.flatMap((clave) => desdeJwk(clave));
  const fijo = jwkDeEntorno(process.env.CAVOS_JWT_JWK);
  if (fijo === null && ajustes.jwks.length === 0) return null;
  const remotas: Clave[] = [];
  for (const fuente of ajustes.jwks) {
    const bajadas = await descargar(fuente.url);
    for (const jwk of bajadas) remotas.push({ jwk, iss: fuente.iss });
  }
  return [...(fijo ?? []), ...remotas];
}

function audCoincide(aud: unknown, esperados: string[]): boolean {
  const valores = typeof aud === "string" ? [aud] : Array.isArray(aud) ? aud.filter((item) => typeof item === "string") : [];
  return valores.some((item) => esperados.includes(item));
}

function tiempos(claims: Record<string, unknown>, ahoraMs: number): boolean {
  const ahora = Math.floor(ahoraMs / 1000);
  if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp)) return false;
  if (ahora >= claims.exp + HOLGURA_JWT_SEGUNDOS) return false;
  if (!("nbf" in claims) || claims.nbf == null) return true;
  if (typeof claims.nbf !== "number" || !Number.isFinite(claims.nbf)) return false;
  return ahora + HOLGURA_JWT_SEGUNDOS >= claims.nbf;
}

function elegir(claves: Clave[], kid: string | null, iss: string | null): JsonWebKey[] {
  const propias = iss ? claves.filter((clave) => clave.iss === iss) : [];
  const sueltas = claves.filter((clave) => clave.iss === null);
  const delEmisor = propias.length > 0 ? propias : sueltas;
  const firmantes = kid ? delEmisor.filter((clave) => clave.jwk.kid === kid) : delEmisor;
  return firmantes.map((clave) => clave.jwk);
}

function firmaValida(encabezado: string, cuerpo: string, firma: string, claves: JsonWebKey[]): boolean {
  let bytes: Buffer;
  try {
    bytes = Buffer.from(firma, "base64url");
  } catch {
    return false;
  }
  if (!bytes.length) return false;
  const datos = Buffer.from(`${encabezado}.${cuerpo}`);
  for (const clave of claves) {
    try {
      const publica = createPublicKey({ key: clave, format: "jwk" });
      const verificar = createVerify("RSA-SHA256");
      verificar.update(datos);
      verificar.end();
      if (verificar.verify(publica, bytes)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

function jwkDeEntorno(valor: string | undefined): Clave[] | null {
  const texto = valor?.trim();
  if (!texto) return null;
  try {
    return normalizarClaves(JSON.parse(texto) as unknown, null);
  } catch {
    return [];
  }
}

function normalizarClaves(json: unknown, issHeredado: string | null): Clave[] {
  if (Array.isArray(json)) return json.flatMap((item) => normalizarClaves(item, issHeredado));
  if (!json || typeof json !== "object") return [];
  const obj = json as Record<string, unknown>;
  if (Array.isArray(obj.keys)) {
    const iss = texto(obj.iss) ?? issHeredado;
    return obj.keys.flatMap((item) => normalizarClaves(item, iss));
  }
  if (obj.kty !== "RSA" && esMapaEmisores(obj)) {
    return Object.entries(obj).flatMap(([iss, valor]) => normalizarClaves(valor, iss));
  }
  return desdeJwk(obj as ClaveJwt, issHeredado);
}

function esMapaEmisores(obj: Record<string, unknown>): boolean {
  const entradas = Object.keys(obj);
  return entradas.length > 0 && entradas.every((clave) => clave.includes("://"));
}

function desdeJwk(clave: ClaveJwt, issHeredado: string | null = null): Clave[] {
  const publica = soloPublica(clave);
  if (!publica) return [];
  return [{ jwk: publica, iss: texto(clave.iss) ?? issHeredado }];
}

function soloPublica(clave: JsonWebKey): JsonWebKey | null {
  if (clave.kty !== "RSA" || typeof clave.n !== "string" || typeof clave.e !== "string") return null;
  if (clave.alg && clave.alg !== "RS256") return null;
  if (clave.use && clave.use !== "sig") return null;
  return {
    kty: "RSA",
    n: clave.n,
    e: clave.e,
    alg: "RS256",
    use: "sig",
    ...(typeof clave.kid === "string" ? { kid: clave.kid } : {}),
  };
}

async function descargar(url: string): Promise<JsonWebKey[]> {
  const segura = urlHttps(url);
  if (!segura) return [];
  const ahora = Date.now();
  const guardada = cache.get(segura);
  if (guardada && guardada.hasta > ahora) return guardada.claves;
  const respuesta = await fetch(segura, {
    redirect: "error",
    signal: AbortSignal.timeout(4000),
    headers: { accept: "application/json" },
  });
  if (!respuesta.ok) throw new Error("jwks");
  const json = (await respuesta.json()) as { keys?: unknown };
  const lista = Array.isArray(json.keys) ? json.keys : [];
  const claves = lista
    .map((item) => (item && typeof item === "object" ? soloPublica(item as JsonWebKey) : null))
    .filter((item): item is JsonWebKey => item !== null);
  if (claves.length > 0) cache.set(segura, { hasta: ahora + TTL_MS, claves });
  return claves;
}

function fuentesJwks(valor: string | null, emisores: string[] | null): FuenteJwks[] {
  if (!valor) return [];
  const urls = partir(valor) ?? [];
  return urls.map((url, indice) => ({
    url,
    iss: urls.length > 1 ? (emisores?.[indice] ?? null) : emisores?.length === 1 ? emisores[0] : null,
  }));
}

function emisoresDe(parcial?: AjustesJwt): string[] | null {
  if (parcial && parcial.emisor !== undefined) {
    if (parcial.emisor === null) return null;
    if (Array.isArray(parcial.emisor)) {
      return parcial.emisor.flatMap((item) => partir(item) ?? []);
    }
    return partir(parcial.emisor);
  }
  return partir(process.env.CAVOS_JWT_ISSUER);
}

function audienciasDe(parcial?: AjustesJwt): string[] | null {
  if (parcial && parcial.audiencia !== undefined) {
    if (parcial.audiencia === null) return null;
    if (Array.isArray(parcial.audiencia)) return parcial.audiencia.flatMap((item) => partir(item) ?? []);
    return partir(parcial.audiencia);
  }
  return partir(process.env.CAVOS_JWT_AUDIENCE);
}

function unirLista(valor: string | string[] | null): string | null {
  if (valor === null) return null;
  const lista = (Array.isArray(valor) ? valor : [valor]).flatMap((item) => partir(item) ?? []);
  return lista.length ? lista.join(",") : null;
}

function urlHttps(valor: string): string | null {
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function leerParte(parte: string): Record<string, unknown> | null {
  try {
    const json = JSON.parse(Buffer.from(parte, "base64url").toString("utf8")) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    return json as Record<string, unknown>;
  } catch {
    return null;
  }
}

function partir(valor: string | undefined | null): string[] | null {
  if (!valor) return null;
  const lista = valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return lista.length ? lista : null;
}

function textoEnv(valor: string | undefined): string | null {
  const limpio = valor?.trim();
  return limpio ? limpio : null;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}
