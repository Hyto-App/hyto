import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type JsonWebKey, type KeyObject } from "node:crypto";
import test from "node:test";
import { correoDelToken } from "./correo";
import { EMISOR_CAVOS, HOLGURA_JWT_SEGUNDOS, type AjustesJwt } from "./jwt";

const AHORA = 1_700_000_000_000;
const { jwk, privateKey } = parClave("prueba");
const otra = parClave("otra");

const ajustes: AjustesJwt = {
  ahora: AHORA,
  emisorCavos: EMISOR_CAVOS,
  audienciaCavos: null,
  clavesCavos: [jwk],
  clienteGoogle: null,
  proyectoFirebase: null,
};

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
    iss: EMISOR_CAVOS,
    exp: Math.floor(AHORA / 1000) + 3600,
    ...extra,
  };
}

function firmar(
  cuerpo: Record<string, unknown>,
  clave: KeyObject = privateKey,
  extra: { alg?: string; kid?: string | null } = {},
): string {
  const encabezado: Record<string, unknown> = { alg: extra.alg ?? "RS256", typ: "JWT" };
  if (extra.kid !== null) encabezado.kid = extra.kid ?? "prueba";
  const h = Buffer.from(JSON.stringify(encabezado)).toString("base64url");
  const p = Buffer.from(JSON.stringify(cuerpo)).toString("base64url");
  const datos = `${h}.${p}`;
  const firma = createSign("RSA-SHA256");
  firma.update(datos);
  firma.end();
  return `${datos}.${firma.sign(clave).toString("base64url")}`;
}

test("toma el correo del token si la firma, el emisor y el plazo coinciden", async () => {
  const correo = await correoDelToken(firmar(claims({ email: "Organizador@demo.hyto" })), "organizador@demo.hyto", ajustes);
  assert.deepEqual(correo, { correo: "organizador@demo.hyto", sub: "abc" });
});

test("acepta user_id cuando no hay sub", async () => {
  const correo = await correoDelToken(firmar(claims({ sub: undefined, user_id: "uid-1" })), "organizador@demo.hyto", ajustes);
  assert.deepEqual(correo, { correo: "organizador@demo.hyto", sub: "uid-1" });
});

test("rechaza otro correo, un token sin sujeto y uno sin email firmado", async () => {
  assert.equal(await correoDelToken(firmar(claims({ email: "otro@demo.hyto" })), "organizador@demo.hyto", ajustes), null);
  assert.equal(await correoDelToken(firmar(claims({ sub: undefined })), "organizador@demo.hyto", ajustes), null);
  assert.equal(await correoDelToken(firmar(claims({ email: undefined })), "organizador@demo.hyto", ajustes), null);
  assert.equal(await correoDelToken("no-es-token", "organizador@demo.hyto", ajustes), null);
});

test("rechaza una firma ajena, otro emisor, otro kid y alg none", async () => {
  assert.equal(await correoDelToken(firmar(claims(), otra.privateKey), "organizador@demo.hyto", ajustes), null);
  assert.equal(await correoDelToken(firmar(claims({ iss: "https://otro.example" })), "organizador@demo.hyto", ajustes), null);
  assert.equal(await correoDelToken(firmar(claims(), privateKey, { kid: "no-esta" }), "organizador@demo.hyto", ajustes), null);
  const cuerpo = firmar(claims()).split(".")[1];
  const none = Buffer.from(JSON.stringify({ alg: "none", kid: "prueba" })).toString("base64url");
  assert.equal(await correoDelToken(`${none}.${cuerpo}.x`, "organizador@demo.hyto", ajustes), null);
});

test("respeta exp y nbf con la holgura", async () => {
  const exp = Math.floor(AHORA / 1000) - 30;
  const dentro = await correoDelToken(firmar(claims({ exp })), "organizador@demo.hyto", ajustes);
  assert.equal(dentro?.correo, "organizador@demo.hyto");
  const vencido = Math.floor(AHORA / 1000) - HOLGURA_JWT_SEGUNDOS - 1;
  assert.equal(await correoDelToken(firmar(claims({ exp: vencido })), "organizador@demo.hyto", ajustes), null);
  const nbf = Math.floor(AHORA / 1000) + HOLGURA_JWT_SEGUNDOS + 5;
  assert.equal(await correoDelToken(firmar(claims({ nbf })), "organizador@demo.hyto", ajustes), null);
});

test("comprueba aud de Cavos solo si está configurada", async () => {
  const token = firmar(claims({ aud: "hyto" }));
  assert.equal((await correoDelToken(token, "organizador@demo.hyto", { ...ajustes, audienciaCavos: "hyto" }))?.correo, "organizador@demo.hyto");
  assert.equal(await correoDelToken(token, "organizador@demo.hyto", { ...ajustes, audienciaCavos: "otra" }), null);
});

test("Google exige el client id y el aud", async () => {
  const token = firmar(claims({ iss: "https://accounts.google.com", aud: "cliente-google" }));
  assert.equal(await correoDelToken(token, "organizador@demo.hyto", ajustes), null);
  const conGoogle: AjustesJwt = { ...ajustes, clienteGoogle: "cliente-google", clavesGoogle: [jwk] };
  assert.equal((await correoDelToken(token, "organizador@demo.hyto", conGoogle))?.correo, "organizador@demo.hyto");
  assert.equal(await correoDelToken(token, "organizador@demo.hyto", { ...conGoogle, clienteGoogle: "otro-cliente" }), null);
});

test("Firebase exige el project id en iss y aud", async () => {
  const token = firmar(claims({ iss: "https://securetoken.google.com/proyecto-prueba", aud: "proyecto-prueba" }));
  assert.equal(await correoDelToken(token, "organizador@demo.hyto", ajustes), null);
  const conFirebase: AjustesJwt = { ...ajustes, proyectoFirebase: "proyecto-prueba", clavesFirebase: [jwk] };
  assert.equal((await correoDelToken(token, "organizador@demo.hyto", conFirebase))?.correo, "organizador@demo.hyto");
  assert.equal(
    await correoDelToken(firmar(claims({ iss: "https://appleid.apple.com", aud: "hyto" })), "organizador@demo.hyto", ajustes),
    null,
  );
});
