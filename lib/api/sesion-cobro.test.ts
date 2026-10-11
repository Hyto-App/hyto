import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type JsonWebKey } from "node:crypto";
import test from "node:test";
import type { Almacen } from "../db/almacen";
import { crearMemoria } from "../db/memoria";
import { asegurarSemilla } from "../db/semilla";
import { cuentaCobroDe } from "../sesion/cobro";
import { cerrarSesionHttp, crearSesionHttp, fijarWalletHttp } from "./sesion";

const EMISOR = "https://emisor.prueba";
const par = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = par.publicKey.export({ format: "jwk" }) as JsonWebKey;
jwk.kid = "prueba";
jwk.alg = "RS256";
jwk.use = "sig";
process.env.CAVOS_JWT_JWK = JSON.stringify(jwk);
process.env.CAVOS_JWT_ISSUER = EMISOR;
delete process.env.CAVOS_JWT_AUDIENCE;
delete process.env.CAVOS_JWKS_URL;
delete process.env.HYTO_PERMITIR_JWT_SIN_FIRMA;

// Testnet-shaped placeholders. None of them is a real account.
const CUENTA = "G" + "K".repeat(55);
const OTRA = "G" + "M".repeat(55);

function token(email: string, extra: Record<string, unknown> = {}): string {
  const encabezado = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "prueba" })).toString("base64url");
  const cuerpo = Buffer.from(
    JSON.stringify({ sub: "cavos-1", iss: EMISOR, email, exp: Math.floor(Date.now() / 1000) + 3600, ...extra }),
  ).toString("base64url");
  const datos = `${encabezado}.${cuerpo}`;
  const firma = createSign("RSA-SHA256");
  firma.update(datos);
  firma.end();
  return `${datos}.${firma.sign(par.privateKey).toString("base64url")}`;
}

function ingreso(email: string, extra: Record<string, unknown> = {}): Request {
  return new Request("http://local/api/sesion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, token: token(email, extra) }),
  });
}

function wallet(sesion: string, cuenta: string): Request {
  return new Request("http://local/api/sesion/wallet", {
    method: "POST",
    headers: { cookie: `hyto_sesion=${sesion}`, "content-type": "application/json" },
    body: JSON.stringify({ wallet: cuenta }),
  });
}

function salida(sesion: string): Request {
  return new Request("http://local/api/sesion", { method: "DELETE", headers: { cookie: `hyto_sesion=${sesion}` } });
}

async function sesionDe(almacen: Almacen, token: string, email: string, usuarioId: string): Promise<void> {
  await almacen.crearSesion({
    token,
    email,
    usuarioId,
    rol: "voluntario",
    expiraEn: new Date(Date.now() + 60_000).toISOString(),
    wallet: "",
  });
}

test("guardar la wallet de la sesión también la deja en el usuario, y cerrar sesión no la borra", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await sesionDe(almacen, "tok-v1", "voluntario1@demo.hyto", "voluntario-1");

  assert.equal((await fijarWalletHttp(wallet("tok-v1", CUENTA), almacen)).status, 200);
  assert.equal(await almacen.walletCobroDeUsuario("voluntario-1"), CUENTA);
  // The same sign-in cannot switch to another account, so the kept one does not move either.
  assert.equal((await fijarWalletHttp(wallet("tok-v1", OTRA), almacen)).status, 400);
  assert.equal(await almacen.walletCobroDeUsuario("voluntario-1"), CUENTA);

  assert.equal((await cerrarSesionHttp(salida("tok-v1"), almacen)).status, 200);
  assert.equal(await almacen.leerSesion("tok-v1"), null);
  assert.equal(await almacen.walletDeUsuario("voluntario-1"), null);
  assert.equal(await almacen.walletCobroDeUsuario("voluntario-1"), CUENTA);
  assert.equal(await cuentaCobroDe(almacen, "voluntario-1"), CUENTA);
  assert.equal((await almacen.leerUsuario("voluntario-1"))?.walletCobro, undefined);
});

test("el ingreso con una G… en el JWT la deja en el usuario y la más nueva gana", async () => {
  const almacen = crearMemoria();
  const primera = await crearSesionHttp(ingreso("ana@hyto.app", { wallet: CUENTA }), almacen);
  assert.equal(primera.status, 200);
  const { usuarioId } = (await primera.json()) as { usuarioId: string };
  assert.equal(await almacen.walletCobroDeUsuario(usuarioId), CUENTA);

  assert.equal((await crearSesionHttp(ingreso("ana@hyto.app"), almacen)).status, 200);
  assert.equal(await almacen.walletCobroDeUsuario(usuarioId), CUENTA);

  assert.equal((await crearSesionHttp(ingreso("ana@hyto.app", { wallet: OTRA }), almacen)).status, 200);
  assert.equal(await almacen.walletCobroDeUsuario(usuarioId), OTRA);
});

test("una sesión demo no deja cuenta de cobro en el usuario", async () => {
  const almacen = crearMemoria();
  await asegurarSemilla(almacen);
  await sesionDe(almacen, "tok-demo", "demo-voluntario@hyto.demo", "demo-voluntario");
  assert.equal((await fijarWalletHttp(wallet("tok-demo", CUENTA), almacen)).status, 200);
  assert.equal((await almacen.leerSesion("tok-demo"))?.wallet, CUENTA);
  assert.equal(await almacen.walletCobroDeUsuario("demo-voluntario"), null);
  assert.equal(await cuentaCobroDe(almacen, "demo-voluntario"), null);
});

test("si la copia en el usuario falla, el ingreso sigue y el registro no lleva datos de la persona", async () => {
  const base = crearMemoria();
  await asegurarSemilla(base);
  const almacen: Almacen = {
    ...base,
    guardarWalletCobro: async () => {
      throw new Error(`la base no escribe ${CUENTA}`);
    },
  };
  await sesionDe(almacen, "tok-falla", "voluntario2@demo.hyto", "voluntario-2");
  const avisos: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    avisos.push(args.map(String).join(" "));
  };
  let estadoWallet = 0;
  let estadoIngreso = 0;
  try {
    estadoWallet = (await fijarWalletHttp(wallet("tok-falla", CUENTA), almacen)).status;
    estadoIngreso = (await crearSesionHttp(ingreso("voluntario2@demo.hyto", { wallet: CUENTA }), almacen)).status;
  } finally {
    console.warn = original;
  }
  assert.equal(estadoWallet, 200);
  assert.equal(estadoIngreso, 200);
  assert.equal((await almacen.leerSesion("tok-falla"))?.wallet, CUENTA);
  assert.equal(await cuentaCobroDe(almacen, "voluntario-2"), CUENTA);
  assert.equal(avisos.length, 2);
  for (const aviso of avisos) {
    assert.match(aviso, /^\[api\/sesion\] /);
    for (const dato of [CUENTA, "voluntario2@demo.hyto", "tok-falla", "la base no escribe"]) {
      assert.equal(aviso.includes(dato), false, aviso);
    }
  }
});
