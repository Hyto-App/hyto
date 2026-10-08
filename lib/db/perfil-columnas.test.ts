import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { drizzle as drizzleProxy, type RemoteCallback } from "drizzle-orm/pg-proxy";
import { crearAlmacenDesde, type DbAlmacen } from "./neon";

const BASE = ["email", "id", "nombre", "rol"];
const PERFIL = ["etiquetas", "experiencia"];
const TIPO = ["empresa_actividad", "empresa_descripcion", "empresa_foto", "empresa_nombre", "tipo_cuenta"];

function columnasDe(consulta: string): string[] {
  const normal = consulta.replace(/\s+/g, " ");
  const hallado = /select (.+) from "usuarios"/i.exec(normal);
  if (!hallado?.[1]) throw new Error(`no se pudo leer select: ${normal}`);
  return hallado[1]
    .split(",")
    .map((parte) => parte.trim().replace(/"/g, "").split(".").pop() ?? "")
    .sort();
}

function grabar() {
  const consultas: string[] = [];
  const callback: RemoteCallback = async (consulta) => {
    consultas.push(consulta);
    return { rows: [] };
  };
  return {
    consultas,
    almacen: crearAlmacenDesde(drizzleProxy(callback) as unknown as DbAlmacen),
  };
}

async function conInterruptores(
  perfil: string | undefined,
  tipo: string | undefined,
  trabajo: () => Promise<void>,
): Promise<void> {
  const previoPerfil = process.env.HYTO_PERFIL_VOLUNTARIO;
  const previoTipo = process.env.HYTO_TIPO_CUENTA;
  if (perfil === undefined) delete process.env.HYTO_PERFIL_VOLUNTARIO;
  else process.env.HYTO_PERFIL_VOLUNTARIO = perfil;
  if (tipo === undefined) delete process.env.HYTO_TIPO_CUENTA;
  else process.env.HYTO_TIPO_CUENTA = tipo;
  try {
    await trabajo();
  } finally {
    if (previoPerfil === undefined) delete process.env.HYTO_PERFIL_VOLUNTARIO;
    else process.env.HYTO_PERFIL_VOLUNTARIO = previoPerfil;
    if (previoTipo === undefined) delete process.env.HYTO_TIPO_CUENTA;
    else process.env.HYTO_TIPO_CUENTA = previoTipo;
  }
}

test("el select de usuarios omite cada grupo cuando su interruptor está apagado", async () => {
  await conInterruptores(undefined, undefined, async () => {
    const { consultas, almacen } = grabar();
    assert.deepEqual(await almacen.listarUsuarios(), []);
    assert.equal(await almacen.leerUsuario("leo"), null);
    const email = await almacen.usuarioPorEmail("ana@hyto.app");
    assert.equal(email, null);
    assert.equal(consultas.length, 3);
    for (const consulta of consultas) assert.deepEqual(columnasDe(consulta), BASE);
  });

  await conInterruptores("on", undefined, async () => {
    const { consultas, almacen } = grabar();
    await almacen.listarUsuarios();
    await almacen.leerUsuario("leo");
    assert.equal(consultas.length, 2);
    for (const consulta of consultas) {
      assert.deepEqual(columnasDe(consulta), [...BASE, ...PERFIL].sort());
      for (const columna of TIPO) assert.equal(columnasDe(consulta).includes(columna), false);
    }
  });

  await conInterruptores(undefined, "on", async () => {
    const { consultas, almacen } = grabar();
    await almacen.listarUsuarios();
    await almacen.leerUsuario("leo");
    for (const consulta of consultas) {
      assert.deepEqual(columnasDe(consulta), [...BASE, ...TIPO].sort());
      for (const columna of PERFIL) assert.equal(columnasDe(consulta).includes(columna), false);
    }
  });

  await conInterruptores("true", "1", async () => {
    const { consultas, almacen } = grabar();
    await almacen.listarUsuarios();
    assert.deepEqual(columnasDe(consultas[0] ?? ""), BASE);
  });

  await conInterruptores("on", "on", async () => {
    const { consultas, almacen } = grabar();
    await almacen.usuarioPorEmail("ana@hyto.app");
    assert.deepEqual(columnasDe(consultas[0] ?? ""), BASE);
    await almacen.insertarUsuario({
      id: "u1",
      email: "ana@hyto.app",
      nombre: "Ana",
      rol: "voluntario",
      experiencia: "Cocina",
      etiquetas: ["puntual"],
      tipoCuenta: "voluntario",
    });
    const alta = consultas.find((consulta) => /insert into "usuarios"/i.test(consulta)) ?? "";
    assert.equal(alta.includes('"experiencia"'), false);
    assert.equal(alta.includes('"etiquetas"'), false);
  });
});

test("guardar el perfil no toca el rol del evento y apagado no consulta", async () => {
  await conInterruptores(undefined, undefined, async () => {
    const { consultas, almacen } = grabar();
    await almacen.guardarPerfilVoluntario("leo", { experiencia: "Cocina", etiquetas: '["puntual"]' });
    assert.deepEqual(consultas, []);
  });

  await conInterruptores("on", "on", async () => {
    const { consultas, almacen } = grabar();
    await almacen.guardarPerfilVoluntario("leo", { experiencia: "Cocina", etiquetas: '["puntual"]' });
    assert.equal(consultas.length, 1);
    const sql = consultas[0] ?? "";
    assert.match(sql, /update "usuarios"/i);
    assert.match(sql, /"experiencia"/);
    assert.match(sql, /"etiquetas"/);
    assert.equal(sql.includes('"rol"'), false);
    assert.equal(sql.includes("proyecto_miembros"), false);
    assert.equal(sql.includes("tipo_cuenta"), false);
  });
});

test("0012 solo agrega columnas y queda entre 0011 y 0013", () => {
  const sql = readFileSync("drizzle/0012_perfil_voluntario.sql", "utf8");
  assert.match(sql, /ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS experiencia text;/);
  assert.match(sql, /ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS etiquetas text;/);
  assert.equal(/\b(DROP|DELETE|TRUNCATE|UPDATE|RENAME)\b/i.test(sql), false);
  assert.equal(/ALTER COLUMN/i.test(sql), false);
  const archivos = readdirSync("drizzle")
    .filter((nombre) => nombre.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
  const lugar = (nombre: string) => archivos.indexOf(nombre);
  assert.equal(lugar("0010_comunidades.sql") >= 0, true);
  assert.equal(lugar("0010_comunidades.sql") < lugar("0011_tipo_cuenta.sql"), true);
  assert.equal(lugar("0011_tipo_cuenta.sql") < lugar("0012_perfil_voluntario.sql"), true);
  assert.equal(lugar("0012_perfil_voluntario.sql") < lugar("0013_tablon.sql"), true);
});
