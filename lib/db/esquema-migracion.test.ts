import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { correrComparacion } from "./correr-comparacion";
import { construirCruce, leerSchemaDrizzle, pendientesConEsteban } from "./cruce-codigo";
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
import { leerMigraciones, normalizarDefault, normalizarTipo, type EsquemaEsperado } from "./esquema-migracion";

test("la migración real declara las seis tablas y las relaciones que el código usa", () => {
  const esperado = leerMigraciones("drizzle");
  assert.deepEqual(esperado.avisos, [
    "Hay un CHECK en proyecto_miembros que este script no compara. Confirmar con Esteban.",
    "Hay un CHECK en proyecto_invitaciones que este script no compara. Confirmar con Esteban.",
    "Hay un CHECK en proyecto_invitaciones que este script no compara. Confirmar con Esteban.",
    "Hay un CHECK en proyecto_invitaciones que este script no compara. Confirmar con Esteban.",
    "Hay un CHECK en proyecto_invitaciones que este script no compara. Confirmar con Esteban.",
    "Hay un CHECK en proyecto_invitaciones que este script no compara. Confirmar con Esteban.",
    "Hay un CHECK en proyecto_invitaciones que este script no compara. Confirmar con Esteban.",
  ]);
  assert.deepEqual(esperado.archivos, [
    "0000_inicio.sql",
    "0001_contrato_escrow.sql",
    "0002_organizador_proyecto.sql",
    "0003_monto_confirmado.sql",
    "0004_miembros_invitaciones.sql",
    "0005_evidencia_antifraude.sql",
    "0006_prioridad_dificultad.sql",
    "0007_requisitos_rechazo.sql",
  ]);
  assert.deepEqual(esperado.tablas, ["usuarios", "proyectos", "tareas", "evidencias", "veredictos", "sesiones", "proyecto_miembros", "proyecto_invitaciones"]);
  assert.equal(esperado.columnas.length, 71);
  const confirmado = esperado.columnas.find((columna) => columna.tabla === "evidencias" && columna.nombre === "monto_confirmado");
  assert.equal(confirmado?.tipo, "text");
  assert.equal(confirmado?.nullable, true);
  const contrato = esperado.columnas.find((columna) => columna.tabla === "tareas" && columna.nombre === "contrato_escrow");
  assert.equal(contrato?.tipo, "text");
  assert.equal(contrato?.nullable, true);
  assert.equal(contrato?.defecto, null);
  assert.equal(
    esperado.columnas.some((columna) => columna.tabla === "sesiones" && columna.nombre === "wallet" && columna.nullable === false),
    true,
  );
  assert.deepEqual(
    esperado.fks.map((fk) => `${fk.tabla}.${fk.columnas[0]}→${fk.tablaRef}.${fk.columnasRef[0]}`),
    [
      "tareas.proyecto_id→proyectos.id",
      "evidencias.tarea_id→tareas.id",
      "veredictos.evidencia_id→evidencias.id",
      "proyectos.organizador_id→usuarios.id",
      "proyecto_miembros.proyecto_id→proyectos.id",
      "proyecto_miembros.usuario_id→usuarios.id",
      "proyecto_invitaciones.proyecto_id→proyectos.id",
      "proyecto_invitaciones.creado_por→usuarios.id",
    ],
  );
  assert.equal(
    esperado.fks.every((fk) => (fk.alBorrar === "c" && fk.alBorrarExplicito) || (fk.alBorrar === "a" && !fk.alBorrarExplicito)),
    true,
  );
  assert.deepEqual(esperado.uniques, [
    { tabla: "usuarios", columnas: ["email"] },
    { tabla: "proyecto_invitaciones", columnas: ["secreto_hash"] },
  ]);
  assert.deepEqual(
    esperado.primaryKeys.map((grupo) => `${grupo.tabla}:${grupo.columnas.join(",")}`),
    [
      "proyecto_miembros:proyecto_id,usuario_id",
      "usuarios:id",
      "proyectos:id",
      "tareas:id",
      "evidencias:id",
      "veredictos:id",
      "sesiones:token",
      "proyecto_invitaciones:id",
    ],
  );
  assert.deepEqual(esperado.indices, [
    { nombre: "evidencias_sha256_idx", tabla: "evidencias" },
    { nombre: "evidencias_phash_idx", tabla: "evidencias" },
  ]);
  const estado = esperado.columnas.find((columna) => columna.tabla === "tareas" && columna.nombre === "estado");
  const condicion = esperado.columnas.find((columna) => columna.tabla === "tareas" && columna.nombre === "condicion");
  const tope = esperado.columnas.find((columna) => columna.tabla === "tareas" && columna.nombre === "tope");
  assert.equal(estado?.defecto, "'pendiente'");
  assert.equal(estado?.nullable, false);
  assert.equal(condicion?.defecto, "''");
  assert.equal(tope?.nullable, true);
  assert.equal(tope?.defecto, null);
  const prioridad = esperado.columnas.find((columna) => columna.tabla === "tareas" && columna.nombre === "prioridad");
  const dificultad = esperado.columnas.find((columna) => columna.tabla === "tareas" && columna.nombre === "dificultad");
  assert.equal(prioridad?.tipo, "text");
  assert.equal(prioridad?.nullable, false);
  assert.equal(prioridad?.defecto, "'normal'");
  assert.equal(dificultad?.tipo, "text");
  assert.equal(dificultad?.nullable, true);
  assert.equal(dificultad?.defecto, null);
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
      "veredictos.noul",
    ],
  );
  assert.deepEqual(cruce.hashPagoEscrituras, ["lib/api/firma.ts"]);
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
    "veredicto-evidencia-unica",
    "veredicto-id-compartido",
    "veredictos-sin-lector",
    "credencial-url-sin-escritura",
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
  assert.equal(codigo, 2);
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
  assert.ok(mensajes.some((mensaje) => mensaje.includes("missing column tareas.hash_pago")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("tareas.nota")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("usuarios.rol") && mensaje.includes("integer")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("tareas.estado") && mensaje.includes("default")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("tareas (proyecto_id) → proyectos (id)")));
  assert.ok(mensajes.some((mensaje) => mensaje.includes("CASCADE") && mensaje.includes("Check with Esteban")));
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
  assert.match(fuente, /process\.exitCode/);
  assert.doesNotMatch(fuente, /process\.exit\s*\(/);
  assert.match(readFileSync("lib/db/diff-esquema.ts", "utf8"), /readOnly:\s*true/);
  for (const consulta of Object.values(CONSULTAS)) assert.equal(consulta.trim().toLowerCase().startsWith("select"), true);
  assert.match(CONSULTAS.columnas, /BASE TABLE/);
  assert.doesNotMatch(CONSULTAS.indices, /indisunique\s*=\s*false/);
  assert.match(CONSULTAS.indices, /NOT EXISTS/);
});

test("CREATE UNIQUE INDEX no se informa como índice que falta", () => {
  assert.doesNotMatch(CONSULTAS.indices, /indisunique/);
  assert.match(CONSULTAS.indices, /conindid/);
  conMigracion(
    `CREATE TABLE cosa (
      id text PRIMARY KEY,
      email text NOT NULL
    );
    CREATE UNIQUE INDEX cosa_email_idx ON cosa (email);`,
    (esperado) => {
      assert.deepEqual(esperado.avisos, []);
      assert.deepEqual(esperado.indices, [{ nombre: "cosa_email_idx", tabla: "cosa" }]);
      assert.deepEqual(esperado.uniques, []);
      assert.deepEqual(compararEsquema(esperado, observadoDesdeFilas(lecturaDesdeLote(loteDesde(esperado)))), []);
    },
  );
});

test("una vista no se informa como tabla de más", () => {
  assert.match(CONSULTAS.columnas, /table_type = 'BASE TABLE'/);
  conMigracion("CREATE TABLE cosa (id text PRIMARY KEY);", (esperado) => {
    const lectura = lecturaDesdeLote(loteDesde(esperado));
    lectura.columnas.push({
      tabla: "vista_cosa",
      columna: "id",
      tipo_dato: "text",
      udt: "text",
      nulable: "NO",
      defecto: null,
      largo: null,
      precision_num: null,
      escala: null,
    });
    const observado = observadoDesdeFilas(lectura);
    assert.deepEqual(observado.tablas, ["cosa"]);
    assert.equal(
      compararEsquema(esperado, observado).some((item) => item.mensaje.includes("vista_cosa")),
      false,
    );
  });
});

test("la PK compuesta conserva el orden del PRIMARY KEY", () => {
  conMigracion(
    `CREATE TABLE par (
      a text NOT NULL,
      b text NOT NULL,
      PRIMARY KEY (b, a)
    );`,
    (esperado) => {
      assert.deepEqual(esperado.avisos, []);
      assert.deepEqual(esperado.columnas.map((columna) => columna.nombre), ["a", "b"]);
      assert.deepEqual(esperado.primaryKeys, [{ tabla: "par", columnas: ["b", "a"] }]);
      assert.deepEqual(compararEsquema(esperado, observadoDesdeFilas(lecturaDesdeLote(loteDesde(esperado)))), []);
      const invertida = lecturaDesdeLote(loteDesde(esperado));
      for (const fila of invertida.restricciones) {
        if (fila.columna === "b") fila.orden = "2";
        if (fila.columna === "a") fila.orden = "1";
      }
      const mensajes = compararEsquema(esperado, observadoDesdeFilas(invertida)).map((item) => item.mensaje);
      assert.ok(mensajes.some((mensaje) => mensaje.includes("(b, a)")));
      assert.ok(mensajes.some((mensaje) => mensaje.includes("(a, b)")));
    },
  );
});

test("numeric(p) coincide con numeric(p,0) de information_schema", () => {
  conMigracion(
    `CREATE TABLE precios (
      monto numeric(10),
      tasa decimal(8)
    );`,
    (esperado) => {
      assert.deepEqual(esperado.avisos, []);
      assert.equal(esperado.columnas.find((columna) => columna.nombre === "monto")?.tipo, "numeric(10,0)");
      assert.equal(esperado.columnas.find((columna) => columna.nombre === "tasa")?.tipo, "numeric(8,0)");
      const lectura = lecturaDesdeLote(loteDesde(esperado));
      for (const fila of lectura.columnas) {
        const precision = fila.columna === "monto" ? 10 : 8;
        fila.tipo_dato = "numeric";
        fila.udt = "numeric";
        fila.precision_num = precision;
        fila.escala = 0;
      }
      assert.deepEqual(compararEsquema(esperado, observadoDesdeFilas(lectura)), []);
    },
  );
});

test("schema.ts lee columnas que no son text()", () => {
  const leido = leerSchemaDrizzle(`export const tareas = pgTable("tareas", {
  id: text("id").primaryKey(),
  monto: integer("monto").notNull(),
  nota: vector("nota"),
});
`);
  assert.equal(leido.columnas.find((columna) => columna.columna === "monto")?.tipo, "integer");
  assert.equal(leido.columnas.find((columna) => columna.columna === "id")?.tipo, "text");
  assert.equal(leido.columnas.some((columna) => columna.columna === "nota"), true);
  assert.match(leido.avisos.join("\n"), /tareas\.nota/);
  assert.match(leido.avisos.join("\n"), /vector/);
});

test("el SQL de drizzle-kit conserva las FK con esquema public", () => {
  conMigracion(
    `CREATE TABLE "proyectos" (
  "id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tareas" (
  "id" text PRIMARY KEY NOT NULL,
  "proyecto_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "notas" (
  "id" text PRIMARY KEY NOT NULL,
  "proyecto_id" text REFERENCES "public"."proyectos"("id")
);`,
    (esperado) => {
      assert.deepEqual(esperado.avisos, []);
      assert.deepEqual(
        esperado.fks.map((fk) => `${fk.tabla}.${fk.columnas[0]}→${fk.tablaRef}.${fk.columnasRef[0]}`),
        ["tareas.proyecto_id→proyectos.id", "notas.proyecto_id→proyectos.id"],
      );
    },
  );
});

test("ON DELETE se lee aunque ON UPDATE vaya antes", () => {
  conMigracion(
    `CREATE TABLE proyectos (
      id text PRIMARY KEY
    );
    CREATE TABLE hijos (
      id text PRIMARY KEY,
      padre_id text NOT NULL,
      CONSTRAINT hijos_padre_fk FOREIGN KEY (padre_id) REFERENCES proyectos (id) ON UPDATE CASCADE ON DELETE CASCADE
    );`,
    (esperado) => {
      assert.deepEqual(esperado.avisos, []);
      const fk = esperado.fks.find((item) => item.tabla === "hijos");
      assert.equal(fk?.alBorrar, "c");
      assert.equal(fk?.alBorrarExplicito, true);
    },
  );
});

test("DEFAULT now() queda leído y un default ilegible sigue en aviso", () => {
  conMigracion(
    `CREATE TABLE marcas (
      id text PRIMARY KEY,
      creado_en timestamp with time zone NOT NULL DEFAULT now()
    );`,
    (esperado) => {
      assert.deepEqual(esperado.avisos, []);
      assert.equal(esperado.columnas.find((columna) => columna.nombre === "creado_en")?.defecto, "now()");
    },
  );
  conMigracion(
    `CREATE TABLE marcas (
      id text PRIMARY KEY,
      marca text DEFAULT current_timestamp
    );`,
    (esperado) => {
      assert.equal(esperado.columnas.find((columna) => columna.nombre === "marca")?.defecto, null);
      assert.match(esperado.avisos.join("\n"), /Default no leído/);
    },
  );
});

test("la salida del script no se corta con process.exit", () => {
  const fuente = readFileSync("scripts/backend-traspaso/comparar-esquema.ts", "utf8");
  assert.match(fuente, /process\.exitCode/);
  assert.doesNotMatch(fuente, /process\.exit\s*\(/);
});

function conMigracion(sql: string, comprobar: (esperado: EsquemaEsperado) => void): void {
  const directorio = mkdtempSync(join(tmpdir(), "hyto-esquema-"));
  try {
    writeFileSync(join(directorio, "0001.sql"), sql);
    comprobar(leerMigraciones(directorio));
  } finally {
    rmSync(directorio, { recursive: true });
  }
}

test("un índice único que no es constraint se conserva y una vista no es tabla de más", () => {
  const directorio = mkdtempSync(join(tmpdir(), "hyto-indice-"));
  try {
    writeFileSync(
      join(directorio, "0001.sql"),
      "CREATE TABLE usuarios (id text PRIMARY KEY, email text);\nCREATE UNIQUE INDEX usuarios_email_idx ON usuarios (email);\n",
    );
    const esperado = leerMigraciones(directorio);
    assert.deepEqual(esperado.avisos, []);
    assert.deepEqual(esperado.indices, [{ nombre: "usuarios_email_idx", tabla: "usuarios" }]);
    assert.deepEqual(esperado.uniques, []);
    const observado = observadoDesdeFilas({
      tablas: [{ tabla: "usuarios" }],
      columnas: [
        { ...filaColumna("usuarios", "id", "text"), nulable: "NO" },
        filaColumna("usuarios", "email", "text"),
        filaColumna("usuarios_v", "email", "text"),
      ],
      restricciones: [restriccion("p", "usuarios_pkey", "usuarios", "id", 1, null, null, null)],
      indices: [{ tabla: "usuarios", indice: "usuarios_email_idx" }],
    });
    assert.deepEqual(observado.tablas, ["usuarios"]);
    assert.deepEqual(compararEsquema(esperado, observado), []);
  } finally {
    rmSync(directorio, { recursive: true });
  }
});

test("la llave primaria compuesta respeta el orden del PRIMARY KEY", () => {
  const directorio = mkdtempSync(join(tmpdir(), "hyto-pk-"));
  try {
    writeFileSync(
      join(directorio, "0001.sql"),
      "CREATE TABLE pareja (a integer NOT NULL, b integer NOT NULL, PRIMARY KEY (b, a));\n",
    );
    const esperado = leerMigraciones(directorio);
    assert.deepEqual(esperado.avisos, []);
    assert.deepEqual(esperado.primaryKeys, [{ tabla: "pareja", columnas: ["b", "a"] }]);
    const alReves = observadoDesdeFilas({
      tablas: [{ tabla: "pareja" }],
      columnas: [filaColumna("pareja", "a", "integer"), filaColumna("pareja", "b", "integer")],
      restricciones: [
        restriccion("p", "pareja_pkey", "pareja", "a", 1, null, null, null),
        restriccion("p", "pareja_pkey", "pareja", "b", 2, null, null, null),
      ],
      indices: [],
    });
    const mensajes = compararEsquema(esperado, alReves).map((item) => item.mensaje);
    assert.ok(mensajes.some((mensaje) => mensaje.includes("(b, a)")));
    assert.ok(mensajes.some((mensaje) => mensaje.includes("(a, b)")));
  } finally {
    rmSync(directorio, { recursive: true });
  }
});

test("numeric(10) y decimal(10) se comparan como numeric(10,0)", () => {
  assert.equal(normalizarTipo("numeric(10)"), "numeric(10,0)");
  assert.equal(normalizarTipo("decimal(10)"), "numeric(10,0)");
  assert.equal(normalizarTipo("decimal(10, 2)"), "numeric(10,2)");
  const directorio = mkdtempSync(join(tmpdir(), "hyto-num-"));
  try {
    writeFileSync(join(directorio, "0001.sql"), "CREATE TABLE precios (monto numeric(10) NOT NULL, tasa decimal(8));\n");
    const esperado = leerMigraciones(directorio);
    assert.deepEqual(esperado.avisos, []);
    assert.equal(esperado.columnas.find((columna) => columna.nombre === "monto")?.tipo, "numeric(10,0)");
    assert.equal(esperado.columnas.find((columna) => columna.nombre === "tasa")?.tipo, "numeric(8,0)");
    const observado = observadoDesdeFilas({
      tablas: [{ tabla: "precios" }],
      columnas: [
        { ...filaColumna("precios", "monto", "numeric"), tipo_dato: "numeric", precision_num: 10, escala: 0, nulable: "NO" },
        { ...filaColumna("precios", "tasa", "numeric"), tipo_dato: "numeric", precision_num: 8, escala: 0 },
      ],
      restricciones: [],
      indices: [],
    });
    assert.deepEqual(compararEsquema(esperado, observado), []);
  } finally {
    rmSync(directorio, { recursive: true });
  }
});

test("timestamp, time, character(n) y varchar(n) se leen como en information_schema", () => {
  assert.equal(normalizarTipo("timestamp"), "timestamp without time zone");
  assert.equal(normalizarTipo("timestamp(3)"), "timestamp without time zone");
  assert.equal(normalizarTipo("timestamptz"), "timestamp with time zone");
  assert.equal(normalizarTipo("timestamp(3) with time zone"), "timestamp with time zone");
  assert.equal(normalizarTipo("char(2)"), "character(2)");
  assert.equal(normalizarTipo("serial"), "integer");
  assert.equal(normalizarTipo("smallserial"), "smallint");
  assert.equal(normalizarTipo("bigserial"), "bigint");
  conMigracion(
    `CREATE TABLE marcas (
      id serial PRIMARY KEY,
      corto smallserial,
      largo bigserial,
      codigo character(2) NOT NULL,
      sigla char(3) NOT NULL,
      nombre varchar(40) NOT NULL,
      hora time,
      creado timestamp NOT NULL,
      creado_sin timestamp without time zone,
      creado_tz timestamp with time zone,
      creado_abrev timestamptz,
      preciso timestamp(3) with time zone NOT NULL
    );`,
    (esperado) => {
      assert.deepEqual(esperado.avisos, []);
      const tipo = (nombre: string) => esperado.columnas.find((columna) => columna.nombre === nombre);
      assert.equal(tipo("id")?.tipo, "integer");
      assert.equal(tipo("id")?.primaryKey, true);
      assert.equal(tipo("id")?.nullable, false);
      assert.equal(tipo("corto")?.tipo, "smallint");
      assert.equal(tipo("largo")?.tipo, "bigint");
      assert.equal(tipo("codigo")?.tipo, "character(2)");
      assert.equal(tipo("codigo")?.nullable, false);
      assert.equal(tipo("sigla")?.tipo, "character(3)");
      assert.equal(tipo("nombre")?.tipo, "character varying(40)");
      assert.equal(tipo("hora")?.tipo, "time");
      assert.equal(tipo("creado")?.tipo, "timestamp without time zone");
      assert.equal(tipo("creado")?.nullable, false);
      assert.equal(tipo("creado_sin")?.tipo, "timestamp without time zone");
      assert.equal(tipo("creado_tz")?.tipo, "timestamp with time zone");
      assert.equal(tipo("creado_abrev")?.tipo, "timestamp with time zone");
      assert.equal(tipo("preciso")?.tipo, "timestamp with time zone");
      assert.equal(tipo("preciso")?.nullable, false);
    },
  );
});

test("un cast en el DEFAULT no se traga NOT NULL ni UNIQUE", () => {
  conMigracion(
    `CREATE TABLE estados (
      id integer PRIMARY KEY,
      estado text DEFAULT 'pendiente'::text NOT NULL UNIQUE,
      nota character varying(20) DEFAULT 'ok'::character varying NOT NULL,
      creado timestamp DEFAULT now()::timestamp without time zone NOT NULL,
      preciso timestamp(3) with time zone DEFAULT now()::timestamp(3) with time zone NOT NULL
    );`,
    (esperado) => {
      assert.deepEqual(esperado.avisos, []);
      const estado = esperado.columnas.find((columna) => columna.nombre === "estado");
      assert.equal(estado?.defecto, "'pendiente'");
      assert.equal(estado?.nullable, false);
      assert.equal(estado?.unique, true);
      const nota = esperado.columnas.find((columna) => columna.nombre === "nota");
      assert.equal(nota?.defecto, "'ok'");
      assert.equal(nota?.nullable, false);
      assert.equal(nota?.tipo, "character varying(20)");
      const creado = esperado.columnas.find((columna) => columna.nombre === "creado");
      assert.equal(creado?.defecto, "now()");
      assert.equal(creado?.nullable, false);
      assert.equal(creado?.tipo, "timestamp without time zone");
      const preciso = esperado.columnas.find((columna) => columna.nombre === "preciso");
      assert.equal(preciso?.defecto, "now()");
      assert.equal(preciso?.nullable, false);
      assert.equal(preciso?.tipo, "timestamp with time zone");
    },
  );
});

test("schema.ts lee references con onDelete, defaults que no son string y defaultNow", () => {
  const leido = leerSchemaDrizzle(`
export const proyectos = pgTable("proyectos", {
  id: text("id").primaryKey(),
});
export const tareas = pgTable("tareas", {
  id: serial("id").primaryKey(),
  chico: smallserial("chico"),
  grande: bigserial("grande"),
  proyectoId: text("proyecto_id").notNull().references(() => proyectos.id, { onDelete: "cascade" }),
  activo: boolean("activo").notNull().default(true),
  cantidad: integer("cantidad").notNull().default(0),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  nombre: varchar("nombre", { length: 40 }).default("hola"),
});
`);
  assert.deepEqual(leido.avisos, []);
  const porNombre = new Map(leido.columnas.map((columna) => [columna.columna, columna]));
  assert.equal(porNombre.get("id")?.tipo, "integer");
  assert.equal(porNombre.get("chico")?.tipo, "smallint");
  assert.equal(porNombre.get("grande")?.tipo, "bigint");
  assert.deepEqual(porNombre.get("proyecto_id")?.referencia, { tabla: "proyectos", columna: "id" });
  assert.equal(porNombre.get("activo")?.defecto, "true");
  assert.equal(porNombre.get("cantidad")?.defecto, "0");
  assert.equal(porNombre.get("creado_en")?.defecto, "now()");
  assert.equal(porNombre.get("creado_en")?.tipo, "timestamp without time zone");
  assert.equal(porNombre.get("nombre")?.defecto, "'hola'");
  assert.equal(porNombre.get("nombre")?.tipo, "character varying(40)");
});

test("schema.ts lee otros builders y avisa si no reconoce uno", () => {
  const leido = leerSchemaDrizzle(`
export const tareas = pgTable("tareas", {
  id: text("id").primaryKey(),
  monto: integer("monto").notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull(),
  raro: vector("raro"),
});
`);
  assert.deepEqual(
    leido.columnas.map((columna) => `${columna.columna}:${columna.tipo}`),
    ["id:text", "monto:integer", "creado_en:timestamp with time zone", "raro:"],
  );
  assert.equal(leido.avisos.length, 1);
  assert.match(leido.avisos[0] ?? "", /vector\(\)/);
  assert.match(leido.avisos[0] ?? "", /Confirmar con Esteban/);
});

test("el SQL de drizzle-kit acepta public y la FK de ALTER TABLE, con ON DELETE después de ON UPDATE", () => {
  const directorio = mkdtempSync(join(tmpdir(), "hyto-fk-"));
  try {
    writeFileSync(
      join(directorio, "0001.sql"),
      `CREATE TABLE "public"."proyectos" ("id" text PRIMARY KEY);
CREATE TABLE "public"."tareas" ("id" text PRIMARY KEY, "proyecto_id" text NOT NULL);
ALTER TABLE "public"."tareas" ADD CONSTRAINT "tareas_proyecto_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON UPDATE CASCADE ON DELETE CASCADE;
CREATE TABLE hijo (padre text NOT NULL, FOREIGN KEY (padre) REFERENCES public.proyectos (id) ON UPDATE CASCADE ON DELETE SET NULL);
`,
    );
    const esperado = leerMigraciones(directorio);
    assert.deepEqual(esperado.avisos, []);
    const porTabla = new Map(esperado.fks.map((fk) => [fk.tabla, fk]));
    assert.equal(porTabla.get("tareas")?.tablaRef, "proyectos");
    assert.deepEqual(porTabla.get("tareas")?.columnas, ["proyecto_id"]);
    assert.equal(porTabla.get("tareas")?.alBorrar, "c");
    assert.equal(porTabla.get("tareas")?.alBorrarExplicito, true);
    assert.equal(porTabla.get("hijo")?.alBorrar, "n");
    assert.equal(porTabla.get("hijo")?.alBorrarExplicito, true);
  } finally {
    rmSync(directorio, { recursive: true });
  }
});

test("DEFAULT now() queda leído y no genera aviso", () => {
  const directorio = mkdtempSync(join(tmpdir(), "hyto-default-"));
  try {
    writeFileSync(
      join(directorio, "0001.sql"),
      "CREATE TABLE marcas (id text PRIMARY KEY, creado timestamp with time zone DEFAULT now() NOT NULL);\n",
    );
    const esperado = leerMigraciones(directorio);
    assert.deepEqual(esperado.avisos, []);
    assert.equal(esperado.columnas.find((columna) => columna.nombre === "creado")?.defecto, "now()");
    writeFileSync(join(directorio, "0002.sql"), "ALTER TABLE marcas ADD COLUMN nota text DEFAULT current_timestamp;\n");
    const conHueco = leerMigraciones(directorio);
    assert.equal(conHueco.avisos.length, 1);
    assert.match(conHueco.avisos[0] ?? "", /Default no leído/);
  } finally {
    rmSync(directorio, { recursive: true });
  }
});

function filaColumna(tabla: string, columna: string, tipo: string): Record<string, unknown> {
  return {
    tabla,
    columna,
    tipo_dato: tipo,
    udt: tipo,
    nulable: "YES",
    defecto: null,
    largo: null,
    precision_num: null,
    escala: null,
  };
}

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
