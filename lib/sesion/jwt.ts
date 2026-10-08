import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";

/**
 * La doc de Cavos (https://docs.cavos.xyz) no publica JWKS ni un audience único.
 * La firma RS256, el `iss`, el `aud` y el vencimiento se comprueban con
 * `CAVOS_JWT_JWK` o `CAVOS_JWKS_URL`. Sin esas claves no hay sesión.
 * `HYTO_PERMITIR_JWT_SIN_FIRMA=1` lee el payload sin firma solo fuera de
 * producción (`NODE_ENV` y `VERCEL_ENV` distintos de `production`), y aun así
 * exige emisor y audiencia.
 * `CAVOS_JWT_ISSUER` y `CAVOS_JWT_AUDIENCE` aceptan varios valores separados por coma.
 * Si el emisor está vacío se usa `EMISORES_JWT_DEFECTO`. Un audience vacío no se salta
 * en producción: un ID token de Firebase se compara con el project id de su `iss`,
 * y cualquier otro token se rechaza.
 */
export const HOLGURA_JWT_SEGUNDOS = 60;

/**
 * Emisores que el login alojado de Cavos devuelve hoy (Google, Apple, el JWT
 * propio de Cavos y los ID tokens de Firebase). Una entrada que termina en `/`
 * vale como prefijo, así `https://securetoken.google.com/<proyecto>` entra.
 */
export const EMISORES_JWT_DEFECTO = [
  "https://accounts.google.com",
  "https://appleid.apple.com",
  "https://cavos.app/firebase",
  "https://securetoken.google.com/",
].join(",");

export const PREFIJO_EMISOR_FIREBASE = "https://securetoken.google.com/";

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { hasta: number; claves: ClavePublica[] }>();

type ClavePublica = {
  jwk: JsonWebKey;
  emisor: string | null;
};

export type AjustesJwt = {
  ahora?: number;
  /** `null` no comprueba `iss` fuera de producción. En producción un `null` rechaza el token. Ausente: `CAVOS_JWT_ISSUER`, o `EMISORES_JWT_DEFECTO` si está vacío. */
  emisor?: string | null;
  /** `null` no comprueba `aud` fuera de producción, salvo un ID token de Firebase, que tiene que coincidir con el project id de su `iss`. En producción un `null` rechaza cualquier otro token. Ausente: `CAVOS_JWT_AUDIENCE`. */
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
  if (claves === null) return bypassSinFirma() && reclamosDeIdentidad(claims, ajustes) ? claims : null;
  const encabezado = leerParte(partes[0]);
  if (!encabezado || encabezado.alg !== "RS256" || "crit" in encabezado) return null;
  const kid = typeof encabezado.kid === "string" ? encabezado.kid : null;
  const elegidas = elegir(claves, kid, claims.iss);
  if (!elegidas.length || !firmaValida(partes[0], partes[1], partes[2], elegidas)) return null;
  if (!reclamosDeIdentidad(claims, ajustes)) return null;
  return claims;
}

function reclamosDeIdentidad(claims: Record<string, unknown>, ajustes: Ajustes): boolean {
  if (!tiempos(claims, ajustes.ahora)) return false;
  if (!emisorPermitido(claims.iss, ajustes.emisor)) return false;
  return audienciaPermitida(claims, ajustes.audiencia);
}

function resolver(parcial?: AjustesJwt): Ajustes {
  return {
    ahora: parcial?.ahora ?? Date.now(),
    emisor: parcial && parcial.emisor !== undefined ? parcial.emisor : (textoEnv(process.env.CAVOS_JWT_ISSUER) ?? EMISORES_JWT_DEFECTO),
    audiencia: parcial && parcial.audiencia !== undefined ? parcial.audiencia : textoEnv(process.env.CAVOS_JWT_AUDIENCE),
    claves: parcial?.claves,
    jwksUrl: parcial && parcial.jwksUrl !== undefined ? parcial.jwksUrl : textoEnv(process.env.CAVOS_JWKS_URL),
  };
}

async function clavesEfectivas(ajustes: Ajustes): Promise<ClavePublica[] | null> {
  if (ajustes.claves !== undefined) return ajustes.claves.map((clave) => publicar(clave)).filter((clave): clave is ClavePublica => clave !== null);
  const fijo = jwkDeEntorno(process.env.CAVOS_JWT_JWK);
  if (fijo !== null) return fijo;
  if (ajustes.jwksUrl) return descargarTodas(ajustes.jwksUrl, listaEmisores(ajustes.emisor));
  return null;
}

function entornoEsProduccion(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function bypassSinFirma(): boolean {
  if (entornoEsProduccion()) return false;
  return process.env.HYTO_PERMITIR_JWT_SIN_FIRMA?.trim() === "1";
}

function emisorPermitido(iss: unknown, esperado: string | null): boolean {
  const permitidos = listaEmisores(esperado);
  if (!permitidos) return !entornoEsProduccion();
  return typeof iss === "string" && permitidos.some((item) => issCoincide(iss, item));
}

function issCoincide(iss: string, permitido: string): boolean {
  if (permitido.endsWith("/")) return iss.startsWith(permitido) && iss.length > permitido.length && !iss.slice(permitido.length).includes("/");
  return iss === permitido;
}

function audienciaPermitida(claims: Record<string, unknown>, esperado: string | null): boolean {
  if (esperado) return audCoincide(claims.aud, esperado);
  const proyecto = proyectoFirebase(claims.iss);
  if (proyecto) return audCoincide(claims.aud, proyecto);
  return !entornoEsProduccion();
}

function proyectoFirebase(iss: unknown): string | null {
  if (typeof iss !== "string" || !iss.startsWith(PREFIJO_EMISOR_FIREBASE)) return null;
  const proyecto = iss.slice(PREFIJO_EMISOR_FIREBASE.length);
  if (!proyecto || proyecto.includes("/")) return null;
  return proyecto;
}

function listaEmisores(valor: string | null): string[] | null {
  if (!valor) return null;
  const lista = [...new Set(valor.split(",").map((item) => item.trim()).filter(Boolean))];
  return lista.length ? lista : null;
}

function audCoincide(aud: unknown, esperado: string): boolean {
  const permitidas = listaEmisores(esperado);
  if (!permitidas) return false;
  if (typeof aud === "string") return permitidas.includes(aud);
  return Array.isArray(aud) && aud.some((item) => typeof item === "string" && permitidas.includes(item));
}

function tiempos(claims: Record<string, unknown>, ahoraMs: number): boolean {
  const ahora = Math.floor(ahoraMs / 1000);
  if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp)) return false;
  if (ahora >= claims.exp + HOLGURA_JWT_SEGUNDOS) return false;
  if (!("nbf" in claims) || claims.nbf == null) return true;
  if (typeof claims.nbf !== "number" || !Number.isFinite(claims.nbf)) return false;
  return ahora + HOLGURA_JWT_SEGUNDOS >= claims.nbf;
}

function elegir(claves: ClavePublica[], kid: string | null, iss: unknown): JsonWebKey[] {
  const emisor = typeof iss === "string" ? iss : null;
  const delEmisor = claves.filter((clave) => !clave.emisor || clave.emisor === emisor);
  if (!kid) return delEmisor.map((clave) => clave.jwk);
  return delEmisor.filter((clave) => clave.jwk.kid === kid).map((clave) => clave.jwk);
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

function jwkDeEntorno(valor: string | undefined): ClavePublica[] | null {
  const texto = valor?.trim();
  if (!texto) return null;
  try {
    return interpretarClaves(JSON.parse(texto) as unknown);
  } catch {
    return [];
  }
}

function interpretarClaves(json: unknown, emisorForzado: string | null = null): ClavePublica[] {
  if (!json || typeof json !== "object") return [];
  if (Array.isArray((json as { keys?: unknown }).keys)) {
    return (json as { keys: unknown[] }).keys.flatMap((item) => interpretarClaves(item, emisorForzado));
  }
  if ("kty" in json) {
    const publicada = publicar(json as JsonWebKey, emisorForzado);
    return publicada ? [publicada] : [];
  }
  const salida: ClavePublica[] = [];
  for (const [emisor, valor] of Object.entries(json as Record<string, unknown>)) {
    if (!emisor.trim()) continue;
    salida.push(...interpretarClaves(valor, emisor.trim()));
  }
  return salida;
}

function publicar(clave: JsonWebKey, emisorForzado: string | null = null): ClavePublica | null {
  const publica = soloPublica(clave);
  if (!publica) return null;
  const propio = typeof (clave as { iss?: unknown }).iss === "string" ? (clave as { iss: string }).iss.trim() : "";
  return { jwk: publica, emisor: emisorForzado || propio || null };
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

async function descargarTodas(valor: string, emisores: string[] | null): Promise<ClavePublica[]> {
  const urls = valor.split(",").map((item) => item.trim()).filter(Boolean);
  const listas = await Promise.all(urls.map((url) => descargar(url).catch(() => [] as ClavePublica[])));
  const emparejar = Boolean(emisores && emisores.length === urls.length && urls.length > 1);
  return listas.flatMap((claves, indice) =>
    claves.map((clave) => ({
      jwk: clave.jwk,
      emisor: clave.emisor ?? (emparejar ? emisores![indice] : null),
    })),
  );
}

async function descargar(url: string): Promise<ClavePublica[]> {
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
  const claves = lista.flatMap((item) => (item && typeof item === "object" ? interpretarClaves(item) : []));
  if (claves.length === 0) {
    cache.delete(segura);
    return [];
  }
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
