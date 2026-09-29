import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { correrComparacion } from "./correr-comparacion";
import { construirCruce, pendientesConEsteban } from "./cruce-codigo";
import {
  CONSULTAS,
  compararEsquema,
  consultarLoteReadOnly,
  esConsultaSoloLectura,
  exigirDatabaseUrl,
  lecturaDesdeLote,
  observadoDesdeFilas,
  ocultarUrl,
  ORDEN_CONSULTAS,
} from "./diff-esquema";
import { leerMigraciones, normalizarDefault, type EsquemaEsperado } from "./esquema-migracion";

test("la migración real declara las seis tablas y las relaciones que el código usa", () => {
  const esperado = leerMigraciones("drizzle");
  assert.deepEqual(esperado.avisos, []);
  assert.deepEqual(esperado.archivos, ["0000_inicio.sql"]);
  assert.deepEqual(esperado.tablas, ["usuarios", "proyectos", "tareas", "evidencias", "veredictos", "sesiones"]);
  assert.equal(esperado.columnas.length, 40);
  assert.deepEqual(
    esperado.fks.map((fk) => `${fk.tabla}.${fk.columnas[0]}→${fk.tablaRef}.${fk.columnasRef[0]}`),
    ["tareas.proyecto_id→proyectos.id", "evidencias.tarea_id→tareas.id", "veredictos.evidencia_id→evidencias.id"],
  );
  assert.equal(esperado.fks.every((fk) => fk.alBorrar === "a" && !fk.alBorrarExplicito), true);
  assert.deepEqual(esperado.uniques, [{ tabla: "usuarios", columnas: ["email"] }]);
  assert.deepEqual(
    esperado.primaryKeys.map((grupo) => `${grupo.tabla}:${grupo.columnas.join(",")}`),
    ["usuarios:id", "proyectos:id", "tareas:id", "evidencias:id", "veredictos:id", "sesiones:token"],
  );
  assert.deepEqual(esperado.indices, []);
  const estado = esperado.columnas.find((columna) => columna.tabla === "tareas" && columna.nombre === "estado");
  const condicion = esperado.columnas.find((columna) => columna.tabla === "tareas" && columna.nombre === "condicion");
  const tope = esperado.columnas.find((columna) => columna.tabla === "tareas" && columna.nombre === "tope");
  assert.equal(estado?.defecto, "'pendiente'");
  assert.equal(estado?.nullable, false);
  assert.equal(condicion?.defecto, "''");
  assert.equal(tope?.nullable, true);
  assert.equal(tope?.defecto, null);
});

test("un SQL que no es una tabla queda para confirmar y no se inventa una columna", () => {
  const directorio = mkdtempSync(join(tmpdir(), "hyto-esquema-"));
  try {
    writeFileSync(
      join(directorio, "0001.sql"),
      "CREATE TABLE cosa (id text PRIMARY KEY);\nGRANT SELECT ON cosa TO lectura;\n",
    );
    const esperado = leerMigraciones(directorio);
    assert.deepEqual(esperado.tablas, ["cosa"]);
    assert.equal(esperado.columnas.length, 1);
    assert.equal(esperado.avisos.length, 1);
    assert.match(esperado.avisos[0] ?? "", /Confirmar con Esteban/);
  } finally {
    rmSync(directorio, { recursive: true });
  }
});

test("schema.ts coincide con la migración y neon no nombra columnas ausentes", () => {
  const esperado = leerMigraciones("drizzle");
  const cruce = construirCruce(process.cwd(), esperado);
  assert.deepEqual(cruce.diferenciasSchema, []);
  assert.deepEqual(cruce.columnasConsultaAusentes, []);
  assert.deepEqual(cruce.tablasSinConsulta, []);
  assert.deepEqual(
    cruce.sinLector.map((columna) => `${columna.tabla}.${columna.columna}`),
    [
      "veredictos.tarea_id",
      "veredictos.texto_scout",
      "veredictos.choice",
      "veredictos.noul",
      "veredictos.score",
      "veredictos.origen",
      "sesiones.email",
      "sesiones.usuario_id",
    ],
  );
  assert.deepEqual(cruce.hashPagoEscrituras, []);
  assert.deepEqual(cruce.credencialEscrituras, []);
  assert.equal(cruce.firmaGuardaHash, false);
  assert.equal(cruce.actualizarAceptaHash, true);
  assert.equal(cruce.actualizarAceptaCredencial, false);
});

test("los pendientes salen de hechos del repo y solo nombran columnas reales", () => {
  const esperado = leerMigraciones("drizzle");
  const cruce = construirCruce(process.cwd(), esperado);
  const pendientes = pendientesConEsteban(esperado, cruce);
  const ids = pendientes.map((item) => item.id);
  assert.deepEqual(ids, [
    "fk-veredictos-tarea",
    "fk-tareas-miembro",
    "fk-sesiones-usuario",
    "sesiones-email",
    "sesiones-usuario-sin-lector",
    "veredicto-evidencia-unica",
    "veredicto-id-compartido",
    "veredictos-sin-lector",
    "hash-pago-sin-escritura",
    "credencial-url-sin-escritura",
    "tipos-text",
    "on-delete",
    "sin-indices",
    "sin-check",
    "email-case",
    "fuente-sql",
  ]);
  for (const pendiente of pendientes) assert.match(pendiente.texto, /Confirmar con Esteban/);
  const conocidas = new Set(esperado.columnas.map((columna) => `${columna.tabla}.${columna.nombre}`));
  for (const pendiente of pendientes) {
    for (const mencion of pendiente.texto.matchAll(/\b(usuarios|proyectos|tareas|evidencias|veredictos|sesiones)\.[a-z0-9_]+/g)) {
      assert.equal(conocidas.has(mencion[0]), true, mencion[0]);
    }
  }
});

test("las consultas del script son SELECT y la transacción es de solo lectura", async () => {
  for (const consulta of ORDEN_CONSULTAS) assert.equal(esConsultaSoloLectura(consulta), true, consulta);
  assert.equal(esConsultaSoloLectura("DELETE FROM usuarios"), false);
  assert.equal(esConsultaSoloLectura("SELECT 1; DELETE FROM usuarios"), false);
  const vistas: { readOnly?: boolean }[] = [];
  let transaccion = 0;
  await consultarLoteReadOnly(
    {
      query: (consulta) => consulta,
      transaction: async (lote, opciones) => {
        transaccion += 1;
        vistas.push(opciones);
        return lote.map(() => []);
      },
    },
    ORDEN_CONSULTAS,
  );
  assert.equal(transaccion, 1);
  assert.deepEqual(vistas, [{ readOnly: true }]);
  await assert.rejects(
    () =>
      consultarLoteReadOnly(
        {
          query: () => {
            throw new Error("no debía armar la consulta");
          },
          transaction: async () => {
            throw new Error("no debía abrir transacción");
          },
        },
        ["UPDATE tareas SET estado = 'pagado'"],
      ),
    /solo ejecuta SELECT/,
  );
});

test("sin DATABASE_URL no consulta la base", async () => {
  const errores: string[] = [];
  let llamadas = 0;
  const codigo = await correrComparacion({
    databaseUrl: "  ",
    directorioMigraciones: "drizzle",
    raiz: process.cwd(),
    consultar: async () => {
      llamadas += 1;
      return [];
    },
    salida: { log: () => undefined, error: (linea) => errores.push(linea) },
  });
  assert.equal(codigo, 1);
  assert.equal(llamadas, 0);
  assert.match(errores.join("\n"), /DATABASE_URL/);
  assert.equal(exigirDatabaseUrl("http://localhost/hyto").ok, false);
  assert.equal(exigirDatabaseUrl("postgres://localhost/hyto").ok, false);
});

test("una copia idéntica a las migraciones no tiene diferencias y no imprime la clave", async () => {
  const esperado = leerMigraciones("drizzle");
  const lote = loteDesde(esperado);
  assert.deepEqual(compararEsquema(esperado, observadoDesdeFilas(lecturaDesdeLote(lote))), []);
  const log: string[] = [];
  const url = "postgres://usuario:secreto@127.0.0.1/copia";
  const codigo = await correrComparacion({
    databaseUrl: url,
    directorioMigraciones: "drizzle",
    raiz: process.cwd(),
    consultar: async (consultas) => {
      assert.deepEqual(consultas, ORDEN_CONSULTAS);
      return lote;
    },
    salida: { log: (linea) => log.push(linea), error: () => undefined },
  });
  assert.equal(codigo, 0);
  assert.match(log.join("\n"), /Sin diferencias/);
  assert.equal(log.some((linea) => linea.includes("secreto")), false);
});

test("informa columna, tipo, FK, índice y ON DELETE, y oculta la URL si la lectura falla", async () => {
  const esperado = leerMigraciones("drizzle");
  const lectura = lecturaDesdeLote(loteDesde(esperado));
  lectura.columnas = lectura.columnas.filter((fila) => fila.columna !== "hash_pago");
  lectura.columnas.push({
    tabla: "tareas",
    columna: "nota",
    tipo_dato: "integer",
    udt: "int4",
    nulable: "YES",
    defecto: null,
    largo: null,
    precision_num: null,
    escala: null,
  });
  const rol = lectura.columnas.find((fila) => fila.tabla === "usuarios" && fila.columna === "rol");
  if (rol) rol.tipo_dato = "integer";
  const estado = lectura.columnas.find((fila) => fila.tabla === "tareas" && fila.columna === "estado");
  if (estado) estado.defecto = null;
  lectura.restricciones = lectura.restricciones.filter((fila) => !(fila.tabla === "tareas" && fila.columna === "proyecto_id"));
  const evidencia = lectura.restricciones.find((fila) => fila.tabla === "evidencias" && fila.columna === "tarea_id" && fila.tipo === "f");
  if (evidencia) evidencia.al_borrar = "c";
  lectura.indices.push({ tabla: "tareas", indice: "tareas_proyecto_idx" });
  const mensajes = compararEsquema(esperado, observadoDesdeFilas(lectura)).map((item) => item.mensaje);
  assert.ok(mensajes.some((mensaje) => mensaje.includes("Falta en la base la columna tareas.hash_pago")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("tareas.nota")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("usuarios.rol") && mensaje.includes("integer")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("tareas.estado") && mensaje.includes("default")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("tareas (proyecto_id) → proyectos (id)")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("CASCADE") && mensaje.includes("Confirmar con Esteban")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("tareas_proyecto_idx")));

  const errores: string[] = [];
  const codigo = await correrComparacion({
    databaseUrl: "postgres://usuario:secreto@127.0.0.1/copia",
    directorioMigraciones: "drizzle",
    raiz: process.cwd(),
    consultar: async () => {
      throw new Error("falló postgres://usuario:secreto@127.0.0.1/copia");
    },
    salida: { log: () => undefined, error: (linea) => errores.push(linea) },
  });
  assert.equal(codigo, 1);
  assert.match(errores.join("\n"), /postgres:\/\/…/);
  assert.equal(errores.some((linea) => linea.includes("secreto")), false);
  assert.equal(ocultarUrl("mira postgres://a:b@host/db ya"), "mira postgres://… ya");
});

test("normaliza el default que devuelve Postgres", () => {
  assert.equal(normalizarDefault("''::text"), "''");
  assert.equal(normalizarDefault("'pendiente'::text"), "'pendiente'");
  assert.equal(normalizarDefault(null), null);
});

test("el comando se niega a correr sin DATABASE_URL", () => {
  const entorno = { ...process.env };
  delete entorno.DATABASE_URL;
  const resultado = spawnSync("node_modules/.bin/tsx", ["scripts/backend-traspaso/comparar-esquema.ts"], {
    env: entorno,
    encoding: "utf8",
  });
  assert.equal(resultado.status, 1);
  assert.match(resultado.stderr, /DATABASE_URL/);
  assert.doesNotMatch(`${resultado.stdout}\n${resultado.stderr}`, /information_schema/);
});

test("el script no contiene sentencias de escritura", () => {
  const fuente = readFileSync("scripts/backend-traspaso/comparar-esquema.ts", "utf8");
  assert.match(fuente, /consultarLoteReadOnly/);
  assert.doesNotMatch(fuente, /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE)\b/);
  assert.match(readFileSync("lib/db/diff-esquema.ts", "utf8"), /readOnly:\s*true/);
  for (const consulta of Object.values(CONSULTAS)) assert.equal(consulta.trim().toLowerCase().startsWith("select"), true);
});

function loteDesde(esperado: EsquemaEsperado): unknown[] {
  const tablas = esperado.tablas.map((tabla) => ({ tabla }));
  const columnas = esperado.columnas.map((columna) => ({
    tabla: columna.tabla,
    columna: columna.nombre,
    tipo_dato: columna.tipo,
    udt: columna.tipo,
    nulable: columna.nullable ? "YES" : "NO",
    defecto: columna.defecto == null ? null : `${columna.defecto}::text`,
    largo: null,
    precision_num: null,
    escala: null,
  }));
  const restricciones: Record<string, unknown>[] = [];
  for (const grupo of esperado.primaryKeys) {
    grupo.columnas.forEach((columna, indice) => {
      restricciones.push(restriccion("p", `${grupo.tabla}_pkey`, grupo.tabla, columna, indice + 1, null, null, null));
    });
  }
  for (const grupo of esperado.uniques) {
    grupo.columnas.forEach((columna, indice) => {
      restricciones.push(restriccion("u", `${grupo.tabla}_${columna}_key`, grupo.tabla, columna, indice + 1, null, null, null));
    });
  }
  for (const fk of esperado.fks) {
    fk.columnas.forEach((columna, indice) => {
      restricciones.push(
        restriccion(
          "f",
          `${fk.tabla}_${columna}_fkey`,
          fk.tabla,
          columna,
          indice + 1,
          fk.tablaRef,
          fk.columnasRef[indice] ?? "",
          fk.alBorrar,
        ),
      );
    });
  }
  const indices = esperado.indices.map((indice) => ({ tabla: indice.tabla, indice: indice.nombre }));
  return [tablas, columnas, restricciones, indices];
}

function restriccion(
  tipo: string,
  nombre: string,
  tabla: string,
  columna: string,
  orden: number,
  tablaRef: string | null,
  columnaRef: string | null,
  alBorrar: string | null,
): Record<string, unknown> {
  return { tipo, nombre, tabla, columna, orden: String(orden), tabla_ref: tablaRef, columna_ref: columnaRef, al_borrar: alBorrar };
}
