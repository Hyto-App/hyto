import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";

/**
 * Emisor del JWT que Cavos firma para el código de correo.
 * `@cavos/kit` 0.2.5 lo reconoce en `providerFromClaims` (`https://cavos.app/firebase`).
 */
export const EMISOR_CAVOS = "https://cavos.app/firebase";

/** JWKS publicado por el backend de Cavos (`CavosAuth` usa `https://cavos.xyz`). */
export const JWKS_CAVOS = "https://cavos.xyz/.well-known/jwks.json";

const JWKS_GOOGLE = "https://www.googleapis.com/oauth2/v3/certs";
const JWKS_FIREBASE = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const EMISORES_GOOGLE = new Set(["https://accounts.google.com", "accounts.google.com"]);

/** Segundos de margen al leer `exp` y `nbf`. */
export const HOLGURA_JWT_SEGUNDOS = 60;

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { hasta: number; claves: JsonWebKey[] }>();

export type AjustesJwt = {
  ahora?: number;
  emisorCavos?: string;
  audienciaCavos?: string | null;
  clavesCavos?: JsonWebKey[];
  clienteGoogle?: string | null;
  clavesGoogle?: JsonWebKey[];
  proyectoFirebase?: string | null;
  clavesFirebase?: JsonWebKey[];
};

type Ajustes = {
  ahora: number;
  emisorCavos: string;
  audienciaCavos: string | null;
  clavesCavos?: JsonWebKey[];
  clienteGoogle: string | null;
  clavesGoogle?: JsonWebKey[];
  proyectoFirebase: string | null;
  clavesFirebase?: JsonWebKey[];
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
  const encabezado = leerParte(partes[0]);
  const claims = leerParte(partes[1]);
  if (!encabezado || !claims) return null;
  if (encabezado.alg !== "RS256" || "crit" in encabezado) return null;
  const kid = typeof encabezado.kid === "string" ? encabezado.kid : null;
  const emisor = typeof claims.iss === "string" ? claims.iss : "";
  const claves = await clavesPara(emisor, ajustes);
  const elegidas = elegir(claves, kid);
  if (!elegidas.length || !firmaValida(partes[0], partes[1], partes[2], elegidas)) return null;
  if (!tiempos(claims, ajustes.ahora)) return null;
  if (!audiencia(emisor, claims, ajustes)) return null;
  return claims;
}

function resolver(parcial?: AjustesJwt): Ajustes {
  return {
    ahora: parcial?.ahora ?? Date.now(),
    emisorCavos: parcial?.emisorCavos?.trim() || process.env.CAVOS_JWT_ISSUER?.trim() || EMISOR_CAVOS,
    audienciaCavos: parcial && parcial.audienciaCavos !== undefined ? parcial.audienciaCavos : textoEnv(process.env.CAVOS_JWT_AUDIENCE),
    clavesCavos: parcial?.clavesCavos,
    clienteGoogle: parcial && parcial.clienteGoogle !== undefined ? parcial.clienteGoogle : textoEnv(process.env.CAVOS_GOOGLE_CLIENT_ID),
    clavesGoogle: parcial?.clavesGoogle,
    proyectoFirebase:
      parcial && parcial.proyectoFirebase !== undefined ? parcial.proyectoFirebase : textoEnv(process.env.CAVOS_FIREBASE_PROJECT_ID),
    clavesFirebase: parcial?.clavesFirebase,
  };
}

async function clavesPara(emisor: string, ajustes: Ajustes): Promise<JsonWebKey[]> {
  if (emisor === ajustes.emisorCavos) {
    if (ajustes.clavesCavos !== undefined) return ajustes.clavesCavos;
    const fijo = jwkDeEntorno(process.env.CAVOS_JWT_JWK);
    if (fijo) return fijo;
    return descargar(process.env.CAVOS_JWKS_URL?.trim() || JWKS_CAVOS);
  }
  if (EMISORES_GOOGLE.has(emisor)) {
    if (!ajustes.clienteGoogle) return [];
    if (ajustes.clavesGoogle !== undefined) return ajustes.clavesGoogle;
    return descargar(process.env.CAVOS_GOOGLE_JWKS_URL?.trim() || JWKS_GOOGLE);
  }
  const proyecto = ajustes.proyectoFirebase;
  if (proyecto && emisor === `https://securetoken.google.com/${proyecto}`) {
    if (ajustes.clavesFirebase !== undefined) return ajustes.clavesFirebase;
    return descargar(process.env.CAVOS_FIREBASE_JWKS_URL?.trim() || JWKS_FIREBASE);
  }
  return [];
}

function audiencia(emisor: string, claims: Record<string, unknown>, ajustes: Ajustes): boolean {
  if (emisor === ajustes.emisorCavos) {
    return !ajustes.audienciaCavos || audCoincide(claims.aud, ajustes.audienciaCavos);
  }
  if (EMISORES_GOOGLE.has(emisor)) {
    return Boolean(ajustes.clienteGoogle) && audCoincide(claims.aud, ajustes.clienteGoogle ?? "");
  }
  if (ajustes.proyectoFirebase && emisor === `https://securetoken.google.com/${ajustes.proyectoFirebase}`) {
    return audCoincide(claims.aud, ajustes.proyectoFirebase);
  }
  return false;
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
    return lista.map((item) => (item && typeof item === "object" ? soloPublica(item as JsonWebKey) : null)).filter((item): item is JsonWebKey => item !== null);
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
