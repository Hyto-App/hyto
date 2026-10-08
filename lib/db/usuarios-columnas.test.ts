import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { drizzle as drizzleProxy, type RemoteCallback } from "drizzle-orm/pg-proxy";
import { crearAlmacenDesde, type DbAlmacen } from "./neon";

const TIPO = /\b(tipo_cuenta|empresa_nombre|empresa_actividad|empresa_descripcion|empresa_foto)\b/;
const PERFIL = /\b(experiencia|etiquetas)\b/;

function ledger() {
  const consultas: string[] = [];
  const callback: RemoteCallback = async (consulta) => {
    consultas.push(consulta);
    return { rows: [] };
  };
  const db = drizzleProxy(callback);
  return { consultas, almacen: crearAlmacenDesde(db as unknown as DbAlmacen) };
}

function selectsUsuario(consultas: string[]): string {
  return consultas.filter((consulta) => /select .+ from "usuarios"/i.test(consulta)).join("\n");
}

test("0011 solo agrega las columnas de tipo de cuenta", () => {
  const sql = readFileSync("drizzle/0011_tipo_cuenta.sql", "utf8");
  const cuerpo = sql.replace(/--.*$/gm, "");
  assert.doesNotMatch(cuerpo, /\b(DROP|DELETE|UPDATE|TRUNCATE|ALTER COLUMN)\b/i);
  for (const columna of ["tipo_cuenta", "empresa_nombre", "empresa_actividad", "empresa_descripcion", "empresa_foto"]) {
    assert.match(sql, new RegExp(`ADD COLUMN IF NOT EXISTS ${columna} text;`, "i"));
  }
});

test("el select de usuarios omite cada grupo cuando su interruptor está apagado", async () => {
  const previoTipo = process.env.HYTO_TIPO_CUENTA;
  const previoPerfil = process.env.HYTO_PERFIL_VOLUNTARIO;
  const restaurar = () => {
    if (previoTipo === undefined) delete process.env.HYTO_TIPO_CUENTA;
    else process.env.HYTO_TIPO_CUENTA = previoTipo;
    if (previoPerfil === undefined) delete process.env.HYTO_PERFIL_VOLUNTARIO;
    else process.env.HYTO_PERFIL_VOLUNTARIO = previoPerfil;
  };
  try {
    delete process.env.HYTO_TIPO_CUENTA;
    delete process.env.HYTO_PERFIL_VOLUNTARIO;
    const apagado = ledger();
    await apagado.almacen.leerUsuario("ana");
    await apagado.almacen.listarUsuarios();
    const sqlApagado = selectsUsuario(apagado.consultas);
    assert.doesNotMatch(sqlApagado, TIPO);
    assert.doesNotMatch(sqlApagado, PERFIL);

    process.env.HYTO_TIPO_CUENTA = "on";
    delete process.env.HYTO_PERFIL_VOLUNTARIO;
    const soloTipo = ledger();
    await soloTipo.almacen.leerUsuario("ana");
    const sqlTipo = selectsUsuario(soloTipo.consultas);
    assert.match(sqlTipo, /tipo_cuenta/);
    assert.match(sqlTipo, /empresa_nombre/);
    assert.match(sqlTipo, /empresa_actividad/);
    assert.match(sqlTipo, /empresa_descripcion/);
    assert.match(sqlTipo, /empresa_foto/);
    assert.doesNotMatch(sqlTipo, PERFIL);

    delete process.env.HYTO_TIPO_CUENTA;
    process.env.HYTO_PERFIL_VOLUNTARIO = "on";
    const soloPerfil = ledger();
    await soloPerfil.almacen.leerUsuario("ana");
    const sqlPerfil = selectsUsuario(soloPerfil.consultas);
    assert.match(sqlPerfil, /experiencia/);
    assert.match(sqlPerfil, /etiquetas/);
    assert.doesNotMatch(sqlPerfil, TIPO);

    process.env.HYTO_TIPO_CUENTA = "on";
    process.env.HYTO_PERFIL_VOLUNTARIO = "on";
    const ambos = ledger();
    await ambos.almacen.insertarUsuario({
      id: "ana",
      email: "ana@hyto.app",
      nombre: "Ana",
      rol: "voluntario",
      tipoCuenta: "empresa",
      empresaNombre: "Norte",
      experiencia: "Ferias",
    });
    const escritura = ambos.consultas.filter((consulta) => consulta.includes('"usuarios"')).join("\n");
    assert.doesNotMatch(escritura, TIPO);
    assert.doesNotMatch(escritura, PERFIL);
    assert.match(escritura, /insert into "usuarios" \("id", "email", "nombre", "rol"\) values/i);
  } finally {
    restaurar();
  }
});
