import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type JsonWebKey, type KeyObject } from "node:crypto";
import test from "node:test";
import { correoDelToken } from "./correo";
import { HOLGURA_JWT_SEGUNDOS, type AjustesJwt } from "./jwt";

delete process.env.CAVOS_JWT_JWK;
delete process.env.CAVOS_JWKS_URL;
delete process.env.CAVOS_JWT_ISSUER;
delete process.env.CAVOS_JWT_AUDIENCE;

const AHORA = 1_700_000_000_000;
const EMISOR = "https://emisor.prueba";
const { jwk, privateKey } = parClave("prueba");
const otra = parClave("otra");

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

test("sin clave configurada el correo sale del token y no del cliente", async () => {
  const correo = await correoDelToken(payload(claims({ email: "Organizador@demo.hyto" })), "", sinClave);
  assert.deepEqual(correo, { correo: "organizador@demo.hyto", sub: "abc" });
  assert.equal(await correoDelToken(payload(claims({ email: undefined })), "organizador@demo.hyto", sinClave), null);
  assert.equal(await correoDelToken(payload(claims()), "otro@demo.hyto", sinClave), null);
});

test("sin clave configurada no autentica la firma", async () => {
  const correo = await correoDelToken(payload(claims()), "organizador@demo.hyto", sinClave);
  assert.equal(correo?.correo, "organizador@demo.hyto");
});

test("con clave configurada exige firma, emisor y plazo", async () => {
  const correo = await correoDelToken(firmar(claims({ email: "Organizador@demo.hyto" })), "organizador@demo.hyto", conClave);
  assert.deepEqual(correo, { correo: "organizador@demo.hyto", sub: "abc" });
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
