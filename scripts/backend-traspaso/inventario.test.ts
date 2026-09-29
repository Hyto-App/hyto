import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { accionesReferencialesEscritasEnReferences, analizarDiff, armarInventario } from "./inventario";
import { parsearSql } from "./leer-sql";

const RAIZ = process.cwd();

test("el SQL real declara seis tablas y el inventario coincide con Drizzle", () => {
  const sql = readFileSync("drizzle/0000_inicio.sql", "utf8");
  const sentencias = parsearSql(sql);
  assert.equal(sentencias.every((sentencia) => sentencia.parseada), true);
  const inventario = armarInventario(RAIZ);
  assert.equal(inventario.consultaANeon, false);
  assert.equal(inventario.comparacionSqlYDrizzle.coinciden, true);
  assert.deepEqual(inventario.comparacionSqlYDrizzle.diferencias, []);
  assert.deepEqual(
    inventario.tablas.map((tabla) => tabla.nombre),
    ["usuarios", "proyectos", "tareas", "evidencias", "veredictos", "sesiones"],
  );
  assert.equal(inventario.sentenciasNoParseadas.length, 0);
  assert.equal(inventario.relaciones.length, 4);

  const tarea = inventario.tablas.find((tabla) => tabla.nombre === "tareas");
  assert.ok(tarea);
  assert.deepEqual(
    tarea.columnas.map((columna) => columna.nombre),
    ["id", "proyecto_id", "titulo", "tipo", "monto", "tope", "condicion", "miembro_id", "wallet_cobro", "estado", "hash_pago", "credencial_url", "contrato_escrow"],
  );
  assert.deepEqual(
    tarea.columnas.filter((columna) => columna.defaultDeclaradoEnSql).map((columna) => [columna.nombre, columna.defaultSql]),
    [
      ["condicion", ""],
      ["miembro_id", ""],
      ["wallet_cobro", ""],
      ["estado", "pendiente"],
    ],
  );
  const proyectoId = tarea.columnas.find((columna) => columna.nombre === "proyecto_id");
  assert.equal(proyectoId?.claveForanea?.tabla, "proyectos");
  assert.deepEqual(proyectoId?.claveForanea?.columnasReferenciadas, ["id"]);
  assert.equal(proyectoId?.claveForanea?.onDeleteEnSql, null);
  assert.equal(proyectoId?.claveForanea?.onDeleteEscritoEnSchemaTs, false);
  assert.equal(proyectoId?.claveForanea?.onDeleteEnDrizzle, "no action");
  assert.equal(proyectoId?.claveForanea?.nombreEnNeon, "confirmar con Esteban");

  for (const tabla of inventario.tablas) {
    assert.equal(tabla.indices.length, 0);
    assert.equal(tabla.llavePrimaria.createIndexEnLaMigracion, false);
    assert.equal(tabla.llavePrimaria.nombreEnNeon, "confirmar con Esteban");
    for (const columna of tabla.columnas) {
      assert.equal(columna.tipoSql, "text");
      assert.equal(columna.tipoDrizzle, "text");
    }
  }

  const usuarios = inventario.tablas.find((tabla) => tabla.nombre === "usuarios");
  const rol = usuarios?.columnas.find((columna) => columna.nombre === "rol");
  assert.ok(rol && "literales" in rol.tipoAplicacion);
  assert.deepEqual(rol.tipoAplicacion.literales, ["organizador", "voluntario"]);
  assert.equal(rol.tipoAplicacion.esCheckDeLaBase, false);
  const email = usuarios?.columnas.find((columna) => columna.nombre === "email");
  assert.equal(email?.esUnico, true);
  assert.equal(email?.nombreUnicoEnSql, null);
  assert.equal(email?.nombreUnicoEscritoEnSchemaTs, false);

  const estado = tarea.columnas.find((columna) => columna.nombre === "estado");
  assert.ok(estado && "literales" in estado.tipoAplicacion);
  assert.deepEqual(estado.tipoAplicacion.literales, ["pendiente", "en revisión", "pagado"]);

  const veredictos = inventario.tablas.find((tabla) => tabla.nombre === "veredictos");
  const tareaId = veredictos?.columnas.find((columna) => columna.nombre === "tarea_id");
  assert.equal(tareaId?.claveForanea, null);
  assert.equal(tareaId?.notNullExplicitoEnSql, true);
  const id = usuarios?.columnas.find((columna) => columna.nombre === "id");
  assert.equal(id?.esLlavePrimaria, true);
  assert.equal(id?.notNullExplicitoEnSql, false);
  assert.equal(id?.aceptaNull, false);

  const sesiones = inventario.tablas.find((tabla) => tabla.nombre === "sesiones");
  assert.deepEqual(sesiones?.llavePrimaria.columnas, ["token"]);
  assert.deepEqual(
    inventario.columnasIdSinFk.map((columna) => `${columna.tabla}.${columna.columna}`),
    ["tareas.miembro_id", "evidencias.blob_id", "veredictos.tarea_id", "sesiones.usuario_id"],
  );
  assert.ok(inventario.pendientesConEsteban.every((pendiente) => pendiente.includes("confirmar con Esteban")));
});

test("el archivo generado sale de armarInventario y no trae una URL", () => {
  const json = JSON.parse(readFileSync("scripts/backend-traspaso/esquema-inventario.json", "utf8")) as {
    base: { sha: string; shaCortoPedido: string; coincideConElShaPedido: boolean; archivosDeEsquemaIgualesAEseCommit: boolean };
    prs: { numero: number; cambiaEsquema: boolean | null }[];
  } & Record<string, unknown>;
  const { base, prs, ...resto } = json;
  assert.deepEqual(resto, armarInventario(RAIZ));
  assert.match(base.sha, /^[0-9a-f]{40}$/);
  assert.match(base.shaCortoPedido, /^[0-9a-f]+$/);
  assert.equal(base.coincideConElShaPedido, base.sha.startsWith(base.shaCortoPedido));
  assert.equal(base.archivosDeEsquemaIgualesAEseCommit, false);
  assert.deepEqual(
    prs.map((pr) => [pr.numero, pr.cambiaEsquema]),
    [
      [15, false],
      [16, false],
    ],
  );
  const texto = readFileSync("scripts/backend-traspaso/esquema-inventario.json", "utf8");
  assert.equal(texto.includes("postgres://"), false);
  assert.equal(texto.includes("postgresql://"), false);
  const fuentes = [
    readFileSync("scripts/backend-traspaso/inventario.ts", "utf8"),
    readFileSync("scripts/backend-traspaso/generar-esquema.ts", "utf8"),
  ].join("\n");
  assert.equal(fuentes.includes("process.env.DATABASE_URL"), false);
  assert.equal(fuentes.includes("neon("), false);
});

test("ALTER TABLE no se inventa y CREATE INDEX sí se lee", () => {
  const alter = parsearSql("ALTER TABLE usuarios ADD COLUMN extra text;");
  assert.equal(alter[0]?.parseada, false);
  if (!alter[0]?.parseada) assert.match(alter[0].nota, /confirmar con Esteban/);
  const indice = parsearSql("CREATE UNIQUE INDEX IF NOT EXISTS tareas_estado_idx ON tareas USING btree (estado DESC);");
  assert.equal(indice[0]?.tipo, "indice");
  if (indice[0]?.tipo === "indice") {
    assert.equal(indice[0].indice.nombre, "tareas_estado_idx");
    assert.equal(indice[0].indice.unico, true);
    assert.equal(indice[0].indice.metodo, "btree");
    assert.deepEqual(indice[0].indice.columnas, [{ nombre: "estado", orden: "desc" }]);
  }
});

test("un diff de revisión no cambia el esquema y uno de migración sí", () => {
  const revision = analizarDiff(`diff --git a/lib/revision/laya.ts b/lib/revision/laya.ts
--- a/lib/revision/laya.ts
+++ b/lib/revision/laya.ts
@@ -1 +1 @@
-viejo
+nuevo
`);
  assert.equal(revision.tocaEsquema, false);

  const markdown = analizarDiff(`diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-antes
+CREATE TABLE no es una migración
`);
  assert.equal(markdown.tocaEsquema, false);

  const esquema = analizarDiff(`diff --git a/lib/db/schema.ts b/lib/db/schema.ts
--- a/lib/db/schema.ts
+++ b/lib/db/schema.ts
@@ -1 +1 @@
-export const usuarios = pgTable("usuarios", {
+export const usuarios = pgTable("usuarios", {
`);
  assert.equal(esquema.tocaEsquema, true);

  const ddl = analizarDiff(`diff --git a/lib/api/tareas.ts b/lib/api/tareas.ts
--- a/lib/api/tareas.ts
+++ b/lib/api/tareas.ts
@@ -1 +1 @@
-const x = 1;
+const sql = "CREATE TABLE sorpresa (id text)";
`);
  assert.equal(ddl.tocaEsquema, true);

  const references = analizarDiff(`diff --git a/lib/api/tareas.ts b/lib/api/tareas.ts
--- a/lib/api/tareas.ts
+++ b/lib/api/tareas.ts
@@ -1 +1 @@
-const x = 1;
+const sql = "proyecto_id text references proyectos (id)";
`);
  assert.equal(references.tocaEsquema, true);
});

test("onDelete y onUpdate se leen solo en el .references() de esa columna", () => {
  const fuente = `
    const nota = "onDelete onUpdate";
    export const tareas = pgTable("tareas", {
      proyectoId: text("proyecto_id")
        .notNull()
        .references(() => proyectos.id),
      otra: text("otra").references(() => proyectos.id, { onDelete: "cascade", onUpdate: "restrict" }),
    });
    export const notas = pgTable("notas", {
      proyectoId: text("proyecto_id").references(() => tareas.id, { onDelete: "set null" }),
    });
  `;
  assert.deepEqual(accionesReferencialesEscritasEnReferences(fuente, "tareas", ["proyecto_id"]), {
    onDelete: false,
    onUpdate: false,
  });
  assert.deepEqual(accionesReferencialesEscritasEnReferences(fuente, "tareas", ["otra"]), {
    onDelete: true,
    onUpdate: true,
  });
  assert.deepEqual(accionesReferencialesEscritasEnReferences(fuente, "notas", ["proyecto_id"]), {
    onDelete: true,
    onUpdate: false,
  });
});
