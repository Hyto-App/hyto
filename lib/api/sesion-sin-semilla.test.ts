import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type JsonWebKey } from "node:crypto";
import test from "node:test";
import type { Almacen } from "../db/almacen";
import { crearMemoria } from "../db/memoria";
import { IDENTIDADES } from "../integrante/identidades";
import { crearSesionHttp } from "./sesion";

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

function token(email: string): string {
  const encabezado = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "prueba" })).toString("base64url");
  const cuerpo = Buffer.from(
    JSON.stringify({ sub: "cavos-1", iss: EMISOR, exp: Math.floor(Date.now() / 1000) + 3600, email }),
  ).toString("base64url");
  const datos = `${encabezado}.${cuerpo}`;
  const firma = createSign("RSA-SHA256");
  firma.update(datos);
  firma.end();
  return `${datos}.${firma.sign(par.privateKey).toString("base64url")}`;
}

function pedido(correo: string, intencion: "signin" | "signup"): Request {
  return new Request("http://local/api/sesion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: correo, token: token(correo), intencion }),
  });
}

/** Counts the calls the seed makes (it reads projects and evidence; sign-in itself never does). */
function contando(base: Almacen): { almacen: Almacen; llamadas: string[] } {
  const llamadas: string[] = [];
  const almacen = new Proxy(base, {
    get(destino, clave, receptor) {
      const valor = Reflect.get(destino, clave, receptor);
      if (typeof valor !== "function") return valor;
      return (...args: unknown[]) => {
        llamadas.push(String(clave));
        return (valor as (...x: unknown[]) => unknown).apply(destino, args);
      };
    },
  });
  return { almacen, llamadas };
}

const SEMILLA = ["listarUsuarios", "leerProyecto", "leerEvidencia", "veredictoDe", "listarTareas", "guardarUsuario"];

test("Sign in de un usuario que ya existe no recorre la semilla", async () => {
  const base = crearMemoria();
  const correo = "ana@hyto.app";
  await base.insertarUsuario({ id: "u-ana", email: correo, nombre: "Ana", rol: "voluntario" });
  const { almacen, llamadas } = contando(base);

  const respuesta = await crearSesionHttp(pedido(correo, "signin"), almacen);
  assert.equal(respuesta.status, 200);
  const cuerpo = (await respuesta.json()) as { usuarioId: string; nuevo: boolean };
  assert.equal(cuerpo.usuarioId, "u-ana");
  assert.equal(cuerpo.nuevo, false);
  assert.deepEqual(llamadas.filter((nombre) => SEMILLA.includes(nombre)), []);
  assert.deepEqual(llamadas, ["usuarioPorEmail", "crearSesion"]);
  assert.ok(respuesta.headers.getSetCookie().some((cookie) => cookie.startsWith("hyto_sesion=")));
});

test("un correo desconocido sigue sembrando antes de decidir: Sign in 404 y Sign up crea la cuenta", async () => {
  const base = crearMemoria();
  const { almacen, llamadas } = contando(base);

  const ingreso = await crearSesionHttp(pedido("nadie@hyto.app", "signin"), almacen);
  assert.equal(ingreso.status, 404);
  assert.ok(llamadas.includes("listarUsuarios"));
  assert.equal((await base.listarUsuarios()).some((usuario) => usuario.email === "nadie@hyto.app"), false);

  const alta = await crearSesionHttp(pedido("nadie@hyto.app", "signup"), almacen);
  assert.equal(alta.status, 200);
  assert.equal(((await alta.json()) as { nuevo: boolean }).nuevo, true);
});

test("una identidad de la semilla en una base vacía entra con Sign in", async () => {
  const base = crearMemoria();
  const identidad = IDENTIDADES[0];
  const respuesta = await crearSesionHttp(pedido(identidad.email, "signin"), base);
  assert.equal(respuesta.status, 200);
  assert.equal(((await respuesta.json()) as { nuevo: boolean }).nuevo, false);
});
