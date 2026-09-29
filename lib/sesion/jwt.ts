import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";

/**
 * La doc de Cavos (https://docs.cavos.xyz) no publica JWKS, emisor, audience
 * ni un endpoint para verificar este JWT. La firma RS256, el `iss`, el `aud`
 * y el vencimiento solo se comprueban si `CAVOS_JWT_JWK` o `CAVOS_JWKS_URL`
 * están definidos. Esos valores quedan pendientes de confirmar con Cavos.
 * Sin ellos el payload se lee, pero la firma no se autentica.
 */
export const HOLGURA_JWT_SEGUNDOS = 60;

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { hasta: number; claves: JsonWebKey[] }>();

export type AjustesJwt = {
  ahora?: number;
  /** `null` no comprueba `iss`. Ausente: se lee `CAVOS_JWT_ISSUER`. */
  emisor?: string | null;
  /** `null` no comprueba `aud`. Ausente: se lee `CAVOS_JWT_AUDIENCE`. */
  audiencia?: string | null;
  /** Ausente: se lee el entorno. Arreglo vacío: hay verificación y ninguna clave sirve. */
  claves?: JsonWebKey[];
  /** `null` no descarga JWKS. Ausente: se lee `CAVOS_JWKS_URL`. */
  jwksUrl?: string | null;
};

type Ajustes = {
  ahora: number;
  emisor: string | null;
  audiencia: string | null;
  claves?: JsonWebKey[];
  jwksUrl: string | null;
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
  if (claves === null) return claims;
  const encabezado = leerParte(partes[0]);
  if (!encabezado || encabezado.alg !== "RS256" || "crit" in encabezado) return null;
  const kid = typeof encabezado.kid === "string" ? encabezado.kid : null;
  const elegidas = elegir(claves, kid);
  if (!elegidas.length || !firmaValida(partes[0], partes[1], partes[2], elegidas)) return null;
  if (!tiempos(claims, ajustes.ahora)) return null;
  if (ajustes.emisor && claims.iss !== ajustes.emisor) return null;
  if (ajustes.audiencia && !audCoincide(claims.aud, ajustes.audiencia)) return null;
  return claims;
}

function resolver(parcial?: AjustesJwt): Ajustes {
  return {
    ahora: parcial?.ahora ?? Date.now(),
    emisor: parcial && parcial.emisor !== undefined ? parcial.emisor : textoEnv(process.env.CAVOS_JWT_ISSUER),
    audiencia: parcial && parcial.audiencia !== undefined ? parcial.audiencia : textoEnv(process.env.CAVOS_JWT_AUDIENCE),
    claves: parcial?.claves,
    jwksUrl: parcial && parcial.jwksUrl !== undefined ? parcial.jwksUrl : textoEnv(process.env.CAVOS_JWKS_URL),
  };
}

async function clavesEfectivas(ajustes: Ajustes): Promise<JsonWebKey[] | null> {
  if (ajustes.claves !== undefined) return ajustes.claves;
  const fijo = jwkDeEntorno(process.env.CAVOS_JWT_JWK);
  if (fijo !== null) return fijo;
  if (ajustes.jwksUrl) return descargar(ajustes.jwksUrl);
  return null;
}

function audCoincide(aud: unknown, esperado: string): boolean {
  if (typeof aud === "string") return aud === esperado;
  return Array.isArray(aud) && aud.some((item) => item === esperado);
}

function tiempos(claims: Record<string, unknown>, ahoraMs: number): boolean {
  const ahora = Math.floor(ahoraMs / 1000);
  if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp)) return false;
  if (ahora >= claims.exp + HOLGURA_JWT_SEGUNDOS) return false;
  if (!("nbf" in claims) || claims.nbf == null) return true;
  if (typeof claims.nbf !== "number" || !Number.isFinite(claims.nbf)) return false;
  return ahora + HOLGURA_JWT_SEGUNDOS >= claims.nbf;
}

function elegir(claves: JsonWebKey[], kid: string | null): JsonWebKey[] {
  const firmantes = claves.map(soloPublica).filter((clave): clave is JsonWebKey => clave !== null);
  if (!kid) return firmantes;
  return firmantes.filter((clave) => clave.kid === kid);
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

function jwkDeEntorno(valor: string | undefined): JsonWebKey[] | null {
  const texto = valor?.trim();
  if (!texto) return null;
  try {
    const json = JSON.parse(texto) as unknown;
    const lista =
      json && typeof json === "object" && Array.isArray((json as { keys?: unknown }).keys)
        ? (json as { keys: unknown[] }).keys
        : [json];
    return lista
      .map((item) => (item && typeof item === "object" ? soloPublica(item as JsonWebKey) : null))
      .filter((item): item is JsonWebKey => item !== null);
  } catch {
    return [];
  }
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
  cache.set(segura, { hasta: ahora + TTL_MS, claves });
  return claves;
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

function textoEnv(valor: string | undefined): string | null {
  const limpio = valor?.trim();
  return limpio ? limpio : null;
}
