import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type JsonWebKey } from "node:crypto";
import test from "node:test";
import { drizzle as drizzleProxy, type RemoteCallback } from "drizzle-orm/pg-proxy";
import { crearSesionHttp } from "@/lib/api/sesion";
import { crearAlmacenDesde, type DbAlmacen } from "./neon";

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
delete process.env.HYTO_COMUNIDADES;
delete process.env.HYTO_TIPO_CUENTA;
delete process.env.HYTO_PERFIL_VOLUNTARIO;
delete process.env.HYTO_TABLON;

const COLUMNAS_NUEVAS =
  /\b(tipo_cuenta|empresa_nombre|empresa_actividad|empresa_descripcion|empresa_foto|experiencia|etiquetas|comunidades|comunidad_miembros|comunidad_solicitudes|comunidad_avisos|comunidad_id)\b/;

type Fila = Record<string, unknown>;

function token(email: string): string {
  const encabezado = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "prueba" })).toString("base64url");
  const cuerpo = Buffer.from(
    JSON.stringify({
      sub: "cavos-1",
      iss: EMISOR,
      email,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url");
  const datos = `${encabezado}.${cuerpo}`;
  const firma = createSign("RSA-SHA256");
  firma.update(datos);
  firma.end();
  return `${datos}.${firma.sign(par.privateKey).toString("base64url")}`;
}

function columnasDe(consulta: string, verbo: "select" | "insert", tabla: string): string[] {
  const normal = consulta.replace(/\s+/g, " ");
  const patron =
    verbo === "select"
      ? new RegExp(`select (.+) from "${tabla}"`, "i")
      : new RegExp(`insert into "${tabla}" \\(([^)]+)\\)`, "i");
  const hallado = patron.exec(normal);
  if (!hallado?.[1]) throw new Error(`no se pudo leer ${verbo} de ${tabla}: ${normal}`);
  return hallado[1].split(",").map((parte) => parte.trim().replace(/"/g, "").split(".").pop() ?? "");
}

/** A ledger that only has the tables and columns from before 0010. */
function ledgerSinMigrar() {
  const usuarios: Fila[] = [];
  const sesiones: Fila[] = [];
  const consultas: string[] = [];
  const callback: RemoteCallback = async (consulta, params) => {
    consultas.push(consulta);
    if (COLUMNAS_NUEVAS.test(consulta)) {
      throw Object.assign(new Error('column "tipo_cuenta" of relation "usuarios" does not exist'), { code: "42703" });
    }
    const texto = consulta.replace(/\s+/g, " ").trim().toLowerCase();
    if (texto.startsWith("select") && texto.includes('from "usuarios"')) {
      const columnas = columnasDe(consulta, "select", "usuarios");
      const email = typeof params[0] === "string" ? params[0] : null;
      const filas = email ? usuarios.filter((fila) => fila.email === email) : usuarios;
      return { rows: filas.map((fila) => columnas.map((columna) => fila[columna] ?? null)) };
    }
    if (texto.startsWith("insert") && texto.includes('into "usuarios"')) {
      const columnas = columnasDe(consulta, "insert", "usuarios");
      const fila: Fila = {};
      columnas.forEach((columna, indice) => {
        fila[columna] = params[indice];
      });
      const email = String(fila.email ?? "");
      if (!usuarios.some((existente) => existente.email === email)) usuarios.push(fila);
      if (texto.includes("returning")) return { rows: [fila] };
      return { rows: [] };
    }
    if (texto.startsWith("insert") && texto.includes('into "sesiones"')) {
      const columnas = columnasDe(consulta, "insert", "sesiones");
      const fila: Fila = {};
      columnas.forEach((columna, indice) => {
        fila[columna] = params[indice];
      });
      sesiones.push(fila);
      return { rows: [] };
    }
    throw new Error(`consulta fuera del alta: ${consulta}`);
  };
  const db = drizzleProxy(callback);
  return {
    consultas,
    usuarios,
    sesiones,
    almacen: crearAlmacenDesde(db as unknown as DbAlmacen),
  };
}

function pedido(email: string, intencion: "signup" | "signin") {
  return new Request("http://local/api/sesion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, token: token(email), intencion }),
  });
}

test("el alta y el ingreso crean la sesión sin las columnas de 0010–0013", async () => {
  const { almacen, consultas, usuarios, sesiones } = ledgerSinMigrar();
  usuarios.push({ id: "u-viejo", email: "ana@hyto.app", nombre: "Ana", rol: "voluntario" });

  const ingreso = await crearSesionHttp(pedido("ana@hyto.app", "signin"), almacen);
  assert.equal(ingreso.status, 200, consultas.join("\n"));
  const cuerpoIngreso = (await ingreso.json()) as { email: string; nuevo: boolean; rol: string };
  assert.equal(cuerpoIngreso.email, "ana@hyto.app");
  assert.equal(cuerpoIngreso.nuevo, false);
  assert.equal(cuerpoIngreso.rol, "voluntario");
  assert.equal(usuarios.length, 1);
  assert.equal(sesiones.length, 1);

  const antesAlta = consultas.length;
  const alta = await crearSesionHttp(pedido("nuevo@hyto.app", "signup"), almacen);
  assert.equal(alta.status, 200, consultas.join("\n"));
  const duranteAlta = consultas.slice(antesAlta);
  const lecturasUsuario = duranteAlta.filter((consulta) => /select .+ from "usuarios"/i.test(consulta));
  assert.equal(lecturasUsuario.length, 1, duranteAlta.join("\n"));
  const cuerpoAlta = (await alta.json()) as { email: string; nuevo: boolean; rol: string };
  assert.equal(cuerpoAlta.email, "nuevo@hyto.app");
  assert.equal(cuerpoAlta.nuevo, true);
  assert.equal(cuerpoAlta.rol, "voluntario");
  assert.equal(usuarios.length, 2);
  assert.deepEqual(
    Object.keys(usuarios[1] ?? {}).sort(),
    ["email", "id", "nombre", "rol"],
  );
  assert.equal(sesiones.length, 2);

  const vuelta = await crearSesionHttp(pedido("nuevo@hyto.app", "signin"), almacen);
  assert.equal(vuelta.status, 200, consultas.join("\n"));
  assert.equal(((await vuelta.json()) as { nuevo: boolean }).nuevo, false);
  assert.equal(usuarios.length, 2);

  await almacen.guardarUsuario({ id: "u-guarda", email: "Guarda@hyto.app", nombre: "Guarda", rol: "voluntario" });
  assert.equal(usuarios.some((fila) => fila.email === "guarda@hyto.app"), true);

  const sqlUsuarios = consultas.filter((consulta) => consulta.includes('"usuarios"')).join("\n");
  assert.doesNotMatch(sqlUsuarios, COLUMNAS_NUEVAS);
  assert.match(sqlUsuarios, /insert into "usuarios" \("id", "email", "nombre", "rol"\) values/i);
  assert.match(sqlUsuarios, /returning "id", "email", "nombre", "rol"/i);
  assert.match(sqlUsuarios, /on conflict \("email"\) do update set "nombre" = excluded\."nombre", "rol" = excluded\."rol"/i);
});

test("el ingreso no nombra columnas de features aunque el interruptor esté encendido", async () => {
  process.env.HYTO_TIPO_CUENTA = "on";
  process.env.HYTO_PERFIL_VOLUNTARIO = "on";
  process.env.HYTO_COMUNIDADES = "on";
  process.env.HYTO_TABLON = "on";
  try {
    const { almacen, consultas, usuarios } = ledgerSinMigrar();
    usuarios.push({ id: "u-viejo", email: "ana@hyto.app", nombre: "Ana", rol: "voluntario" });
    const ingreso = await crearSesionHttp(pedido("ana@hyto.app", "signin"), almacen);
    assert.equal(ingreso.status, 200, consultas.join("\n"));
    const sqlUsuarios = consultas.filter((consulta) => consulta.includes('"usuarios"')).join("\n");
    assert.doesNotMatch(sqlUsuarios, COLUMNAS_NUEVAS);
  } finally {
    delete process.env.HYTO_TIPO_CUENTA;
    delete process.env.HYTO_PERFIL_VOLUNTARIO;
    delete process.env.HYTO_COMUNIDADES;
    delete process.env.HYTO_TABLON;
  }
});
