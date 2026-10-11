import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type JsonWebKey } from "node:crypto";
import test from "node:test";
import { crearSesionHttp } from "@/lib/api/sesion";
import { crearMemoria } from "@/lib/db/memoria";
import type { Usuario } from "@/lib/db/tipos";
import { olvidarNombreDeCorreo } from "./limpiar-nombre";

const EMISOR = "https://emisor.prueba";
const par = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = par.publicKey.export({ format: "jwk" }) as JsonWebKey;
jwk.kid = "prueba-nombres";
jwk.alg = "RS256";
jwk.use = "sig";

const previo = {
  jwk: process.env.CAVOS_JWT_JWK,
  emisor: process.env.CAVOS_JWT_ISSUER,
  audiencia: process.env.CAVOS_JWT_AUDIENCE,
  jwks: process.env.CAVOS_JWKS_URL,
  sinFirma: process.env.HYTO_PERMITIR_JWT_SIN_FIRMA,
};

process.env.CAVOS_JWT_JWK = JSON.stringify(jwk);
process.env.CAVOS_JWT_ISSUER = EMISOR;
delete process.env.CAVOS_JWT_AUDIENCE;
delete process.env.CAVOS_JWKS_URL;
delete process.env.HYTO_PERMITIR_JWT_SIN_FIRMA;

test.after(() => {
  restaurar("CAVOS_JWT_JWK", previo.jwk);
  restaurar("CAVOS_JWT_ISSUER", previo.emisor);
  restaurar("CAVOS_JWT_AUDIENCE", previo.audiencia);
  restaurar("CAVOS_JWKS_URL", previo.jwks);
  restaurar("HYTO_PERMITIR_JWT_SIN_FIRMA", previo.sinFirma);
});

function restaurar(nombre: string, valor: string | undefined) {
  if (valor === undefined) delete process.env[nombre];
  else process.env[nombre] = valor;
}

function token(email: string): string {
  const encabezado = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "prueba-nombres" })).toString("base64url");
  const cuerpo = Buffer.from(
    JSON.stringify({ sub: "cavos-nombres", iss: EMISOR, email, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url");
  const datos = `${encabezado}.${cuerpo}`;
  const firma = createSign("RSA-SHA256");
  firma.update(datos);
  firma.end();
  return `${datos}.${firma.sign(par.privateKey).toString("base64url")}`;
}

function pedido(email: string) {
  return new Request("http://local/api/sesion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, token: token(email), intencion: "signin" }),
  });
}

test("el ingreso borra un nombre que es el inicio del correo y deja uno real", async () => {
  const almacen = crearMemoria();
  await almacen.guardarUsuario({ id: "u-ana", email: "ana@hyto.test", nombre: "ana", rol: "voluntario" });
  await almacen.guardarUsuario({ id: "u-real", email: "real@hyto.test", nombre: "Ana Rojas", rol: "voluntario" });
  await almacen.guardarUsuario({ id: "u-arroba", email: "norte@hyto.test", nombre: "Ana @ Norte", rol: "voluntario" });

  const ingreso = await crearSesionHttp(pedido("ana@hyto.test"), almacen);
  assert.equal(ingreso.status, 200);
  assert.equal(((await ingreso.json()) as { nombre: string }).nombre, "");
  assert.equal((await almacen.leerUsuario("u-ana"))?.nombre, "");

  const real = await crearSesionHttp(pedido("real@hyto.test"), almacen);
  assert.equal(((await real.json()) as { nombre: string }).nombre, "Ana Rojas");
  assert.equal((await almacen.leerUsuario("u-real"))?.nombre, "Ana Rojas");

  const arroba = await crearSesionHttp(pedido("norte@hyto.test"), almacen);
  assert.equal(((await arroba.json()) as { nombre: string }).nombre, "");
  assert.equal((await almacen.leerUsuario("u-arroba"))?.nombre, "Ana @ Norte");
});

test("si no se puede guardar, la sesión sigue y el nombre queda", async () => {
  const usuario: Usuario = { id: "u-ana", email: "ana@hyto.test", nombre: "ana", rol: "voluntario" };
  const original = console.warn;
  console.warn = () => undefined;
  try {
    const seguido = await olvidarNombreDeCorreo(
      {
        vaciarNombre: async () => {
          throw new Error("base caída");
        },
      },
      usuario,
    );
    assert.equal(seguido.nombre, "ana");
  } finally {
    console.warn = original;
  }
});
