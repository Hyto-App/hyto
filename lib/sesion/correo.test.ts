import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type JsonWebKey, type KeyObject } from "node:crypto";
import test from "node:test";
import { correoDelToken, walletDelToken } from "./correo";
import { HOLGURA_JWT_SEGUNDOS, verificarJwt, type AjustesJwt } from "./jwt";

delete process.env.CAVOS_JWT_JWK;
delete process.env.CAVOS_JWKS_URL;
delete process.env.CAVOS_JWT_ISSUER;
delete process.env.CAVOS_JWT_AUDIENCE;
delete process.env.HYTO_PERMITIR_JWT_SIN_FIRMA;

const AHORA = 1_700_000_000_000;
const EMISOR = "https://emisor.prueba";
const EMISOR_CAVOS = "https://cavos.app/firebase";
const EMISOR_GOOGLE = "https://accounts.google.com";
const { jwk, privateKey } = parClave("prueba");
const otra = parClave("otra");
const cavos = parClave("cavos");
const google = parClave("google");

const sinClave: AjustesJwt = { ahora: AHORA, emisor: null, audiencia: null, jwksUrl: null };
const conClave: AjustesJwt = { ...sinClave, emisor: EMISOR, claves: [jwk] };

function parClave(kid: string): { jwk: JsonWebKey; privateKey: KeyObject } {
  const par = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publica = par.publicKey.export({ format: "jwk" }) as JsonWebKey;
  publica.kid = kid;
  publica.alg = "RS256";
  publica.use = "sig";
  return { jwk: publica, privateKey: par.privateKey };
}

function claims(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sub: "abc",
    email: "organizador@demo.hyto",
    iss: EMISOR,
    exp: Math.floor(AHORA / 1000) + 3600,
    ...extra,
  };
}

function payload(cuerpo: Record<string, unknown>): string {
  return `aaaa.${Buffer.from(JSON.stringify(cuerpo)).toString("base64url")}.bbbb`;
}

function restaurar(nombre: string, valor: string | undefined) {
  if (valor === undefined) delete process.env[nombre];
  else process.env[nombre] = valor;
}

function tokenAlgNone(cuerpo: Record<string, unknown>): string {
  const encabezado = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const cuerpoTexto = Buffer.from(JSON.stringify(cuerpo)).toString("base64url");
  return `${encabezado}.${cuerpoTexto}.e30`;
}

function firmar(cuerpo: Record<string, unknown>, clave: KeyObject = privateKey, kid: string | null = "prueba"): string {
  const encabezado: Record<string, unknown> = { alg: "RS256", typ: "JWT" };
  if (kid !== null) encabezado.kid = kid;
  const h = Buffer.from(JSON.stringify(encabezado)).toString("base64url");
  const p = Buffer.from(JSON.stringify(cuerpo)).toString("base64url");
  const datos = `${h}.${p}`;
  const firma = createSign("RSA-SHA256");
  firma.update(datos);
  firma.end();
  return `${datos}.${firma.sign(clave).toString("base64url")}`;
}

test("sin clave configurada no autentica la firma", async () => {
  assert.equal(await correoDelToken(payload(claims()), "organizador@demo.hyto", sinClave), null);
  assert.equal(await correoDelToken(payload(claims({ email: "Organizador@demo.hyto" })), "", sinClave), null);
  assert.equal(await verificarJwt(tokenAlgNone(claims()), sinClave), null);
  assert.equal(await verificarJwt(firmar(claims(), otra.privateKey), sinClave), null);
});

test("la wallet del ingreso sale del token si es una cuenta", () => {
  const cuenta = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  assert.equal(walletDelToken(payload({ sub: "abc", wallet: cuenta })), cuenta);
  assert.equal(walletDelToken(payload({ sub: "abc", identity: { stellar_address: cuenta } })), cuenta);
  assert.equal(walletDelToken(payload({ sub: "abc", email: "a@b.co" })), null);
  assert.equal(walletDelToken(payload({ wallet: "no-es-cuenta" })), null);
});

test("el permiso de desarrollo lee el token sin firma y producción lo ignora", async () => {
  const previo = {
    permiso: process.env.HYTO_PERMITIR_JWT_SIN_FIRMA,
    node: process.env.NODE_ENV,
    vercel: process.env.VERCEL_ENV,
  };
  try {
    process.env.HYTO_PERMITIR_JWT_SIN_FIRMA = "1";
    restaurar("NODE_ENV", "development");
    delete process.env.VERCEL_ENV;
    const correo = await correoDelToken(payload(claims({ email: "Organizador@demo.hyto" })), "", sinClave);
    assert.deepEqual(correo, { correo: "organizador@demo.hyto", sub: "abc", exp: Math.floor(AHORA / 1000) + 3600 });
    assert.equal(await correoDelToken(payload(claims({ email: undefined })), "organizador@demo.hyto", sinClave), null);
    assert.equal(await correoDelToken(payload(claims()), "otro@demo.hyto", sinClave), null);

    process.env.HYTO_PERMITIR_JWT_SIN_FIRMA = "true";
    assert.equal(await correoDelToken(payload(claims()), "organizador@demo.hyto", sinClave), null);

    process.env.HYTO_PERMITIR_JWT_SIN_FIRMA = "1";
    restaurar("NODE_ENV", "production");
    assert.equal(await verificarJwt(payload(claims()), sinClave), null);
    assert.equal(await verificarJwt(tokenAlgNone(claims()), sinClave), null);

    restaurar("NODE_ENV", "test");
    process.env.VERCEL_ENV = "production";
    assert.equal(await verificarJwt(payload(claims()), sinClave), null);
    assert.equal(await verificarJwt(firmar(claims(), otra.privateKey), sinClave), null);
  } finally {
    restaurar("HYTO_PERMITIR_JWT_SIN_FIRMA", previo.permiso);
    restaurar("NODE_ENV", previo.node);
    restaurar("VERCEL_ENV", previo.vercel);
  }
});

test("con clave, un token alg=none o firmado por otra clave no entra", async () => {
  assert.equal(await verificarJwt(tokenAlgNone(claims()), conClave), null);
  assert.equal(await verificarJwt(payload(claims()), conClave), null);
  assert.equal(await verificarJwt(firmar(claims(), otra.privateKey), conClave), null);
});

test("los ingresos por código y por Google usan emisores y claves distintos", async () => {
  const ambos: AjustesJwt = {
    ...sinClave,
    emisor: `${EMISOR_CAVOS}, ${EMISOR_GOOGLE}`,
    claves: [
      { ...cavos.jwk, iss: EMISOR_CAVOS },
      { ...google.jwk, iss: EMISOR_GOOGLE },
    ],
  };
  const codigo = firmar(claims({ iss: EMISOR_CAVOS, email: "voluntario1@demo.hyto" }), cavos.privateKey, "cavos");
  const conGoogle = firmar(claims({ iss: EMISOR_GOOGLE, email: "voluntario1@demo.hyto" }), google.privateKey, "google");
  assert.equal((await correoDelToken(codigo, "voluntario1@demo.hyto", ambos))?.correo, "voluntario1@demo.hyto");
  assert.equal((await correoDelToken(conGoogle, "voluntario1@demo.hyto", ambos))?.correo, "voluntario1@demo.hyto");
  assert.equal(await correoDelToken(firmar(claims({ iss: EMISOR_GOOGLE }), cavos.privateKey, "google"), "voluntario1@demo.hyto", ambos), null);
  assert.equal(await correoDelToken(firmar(claims({ iss: "https://otro.example" }), google.privateKey, "google"), "voluntario1@demo.hyto", ambos), null);

  const soloCavos: AjustesJwt = { ...ambos, emisor: EMISOR_CAVOS };
  assert.equal((await correoDelToken(codigo, "voluntario1@demo.hyto", soloCavos))?.correo, "voluntario1@demo.hyto");
  assert.equal(await correoDelToken(conGoogle, "voluntario1@demo.hyto", soloCavos), null);

  const previoEmisor = process.env.CAVOS_JWT_ISSUER;
  const previoJwk = process.env.CAVOS_JWT_JWK;
  process.env.CAVOS_JWT_ISSUER = `${EMISOR_CAVOS},${EMISOR_GOOGLE}`;
  process.env.CAVOS_JWT_JWK = JSON.stringify({
    [EMISOR_CAVOS]: cavos.jwk,
    [EMISOR_GOOGLE]: google.jwk,
  });
  try {
    const desdeEntorno: AjustesJwt = { ahora: AHORA, audiencia: null, jwksUrl: null };
    assert.equal((await correoDelToken(codigo, "voluntario1@demo.hyto", desdeEntorno))?.correo, "voluntario1@demo.hyto");
    assert.equal((await correoDelToken(conGoogle, "voluntario1@demo.hyto", desdeEntorno))?.correo, "voluntario1@demo.hyto");
    const cruzado = firmar(claims({ iss: EMISOR_CAVOS, email: "voluntario1@demo.hyto" }), google.privateKey, "google");
    assert.equal(await correoDelToken(cruzado, "voluntario1@demo.hyto", desdeEntorno), null);
  } finally {
    restaurar("CAVOS_JWT_ISSUER", previoEmisor);
    restaurar("CAVOS_JWT_JWK", previoJwk);
  }
});

test("cada URL de JWKS verifica el emisor que le corresponde", async () => {
  const original = globalThis.fetch;
  const urlCavos = "https://jwks.prueba.example/cavos";
  const urlGoogle = "https://jwks.prueba.example/google";
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const key = url === urlCavos ? cavos.jwk : google.jwk;
    return new Response(JSON.stringify({ keys: [key] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const ajustes: AjustesJwt = {
      ahora: AHORA,
      emisor: `${EMISOR_CAVOS},${EMISOR_GOOGLE}`,
      audiencia: null,
      jwksUrl: `${urlCavos}, ${urlGoogle}`,
    };
    const codigo = firmar(claims({ iss: EMISOR_CAVOS, email: "voluntario1@demo.hyto" }), cavos.privateKey, "cavos");
    const conGoogle = firmar(claims({ iss: EMISOR_GOOGLE, email: "voluntario1@demo.hyto" }), google.privateKey, "google");
    assert.equal((await correoDelToken(codigo, "voluntario1@demo.hyto", ajustes))?.correo, "voluntario1@demo.hyto");
    assert.equal((await correoDelToken(conGoogle, "voluntario1@demo.hyto", ajustes))?.correo, "voluntario1@demo.hyto");
    const cruzado = firmar(claims({ iss: EMISOR_CAVOS, email: "voluntario1@demo.hyto" }), google.privateKey, "google");
    assert.equal(await correoDelToken(cruzado, "voluntario1@demo.hyto", ajustes), null);
  } finally {
    globalThis.fetch = original;
  }
});

test("un JWKS que falla no anula las claves del otro emisor", async () => {
  const original = globalThis.fetch;
  const urlCavos = "https://jwks.prueba.example/cavos-falla";
  const urlGoogle = "https://jwks.prueba.example/google-sigue";
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === urlCavos) return new Response("no", { status: 500 });
    return new Response(JSON.stringify({ keys: [google.jwk] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    const ajustes: AjustesJwt = {
      ahora: AHORA,
      emisor: `${EMISOR_CAVOS},${EMISOR_GOOGLE}`,
      audiencia: null,
      jwksUrl: `${urlCavos}, ${urlGoogle}`,
    };
    const codigo = firmar(claims({ iss: EMISOR_CAVOS, email: "voluntario1@demo.hyto" }), cavos.privateKey, "cavos");
    const conGoogle = firmar(claims({ iss: EMISOR_GOOGLE, email: "voluntario1@demo.hyto" }), google.privateKey, "google");
    assert.equal(await correoDelToken(codigo, "voluntario1@demo.hyto", ajustes), null);
    assert.equal((await correoDelToken(conGoogle, "voluntario1@demo.hyto", ajustes))?.correo, "voluntario1@demo.hyto");
  } finally {
    globalThis.fetch = original;
  }
});

test("un JWKS vacío o sin claves usables no queda en caché", async () => {
  const original = globalThis.fetch;
  const vacio = "https://jwks.prueba.example/vacio";
  const inutil = "https://jwks.prueba.example/inutil";
  const util = "https://jwks.prueba.example/util";
  const llamadas = new Map<string, number>();
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    llamadas.set(url, (llamadas.get(url) ?? 0) + 1);
    if (url === util) {
      const cuerpo = llamadas.get(url) === 1 ? { keys: [jwk] } : { keys: [] };
      return new Response(JSON.stringify(cuerpo), { status: 200, headers: { "content-type": "application/json" } });
    }
    const keys = url === inutil ? [{ kty: "oct", k: "abc" }] : [];
    return new Response(JSON.stringify({ keys }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const ajustes = (url: string): AjustesJwt => ({ ahora: AHORA, emisor: EMISOR, audiencia: null, jwksUrl: url });
    assert.equal(await verificarJwt(firmar(claims()), ajustes(vacio)), null);
    assert.equal(await verificarJwt(firmar(claims()), ajustes(vacio)), null);
    assert.equal(llamadas.get(vacio), 2);
    assert.equal(await verificarJwt(firmar(claims()), ajustes(inutil)), null);
    assert.equal(await verificarJwt(firmar(claims()), ajustes(inutil)), null);
    assert.equal(llamadas.get(inutil), 2);
    assert.equal((await correoDelToken(firmar(claims()), "organizador@demo.hyto", ajustes(util)))?.correo, "organizador@demo.hyto");
    assert.equal((await correoDelToken(firmar(claims()), "organizador@demo.hyto", ajustes(util)))?.correo, "organizador@demo.hyto");
    assert.equal(llamadas.get(util), 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("con clave configurada exige firma, emisor y plazo", async () => {
  const correo = await correoDelToken(firmar(claims({ email: "Organizador@demo.hyto" })), "organizador@demo.hyto", conClave);
  assert.deepEqual(correo, { correo: "organizador@demo.hyto", sub: "abc", exp: Math.floor(AHORA / 1000) + 3600 });
  assert.equal(await correoDelToken(payload(claims()), "organizador@demo.hyto", conClave), null);
  assert.equal(await correoDelToken(firmar(claims(), otra.privateKey), "organizador@demo.hyto", conClave), null);
  assert.equal(await correoDelToken(firmar(claims({ iss: "https://otro.example" })), "organizador@demo.hyto", conClave), null);
  assert.equal(await correoDelToken(firmar(claims(), privateKey, "no-esta"), "organizador@demo.hyto", conClave), null);
  const vencido = Math.floor(AHORA / 1000) - HOLGURA_JWT_SEGUNDOS - 1;
  assert.equal(await correoDelToken(firmar(claims({ exp: vencido })), "organizador@demo.hyto", conClave), null);
  const dentro = Math.floor(AHORA / 1000) - 30;
  assert.equal((await correoDelToken(firmar(claims({ exp: dentro })), "organizador@demo.hyto", conClave))?.correo, "organizador@demo.hyto");
});

test("la audiencia solo se comprueba si está configurada", async () => {
  const token = firmar(claims({ aud: "hyto" }));
  assert.equal((await correoDelToken(token, "organizador@demo.hyto", { ...conClave, audiencia: "hyto" }))?.correo, "organizador@demo.hyto");
  assert.equal(await correoDelToken(token, "organizador@demo.hyto", { ...conClave, audiencia: "otra" }), null);
  assert.equal((await correoDelToken(token, "organizador@demo.hyto", { ...conClave, audiencia: null }))?.correo, "organizador@demo.hyto");
});

test("rechaza un token sin sujeto", async () => {
  assert.equal(await correoDelToken(payload(claims({ sub: undefined })), "organizador@demo.hyto", sinClave), null);
  assert.equal(await correoDelToken("no-es-token", "organizador@demo.hyto", sinClave), null);
});
