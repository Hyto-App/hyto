import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { EsquemaEsperado } from "./esquema-migracion";
import { normalizarDefault, normalizarTipo } from "./esquema-migracion";

export type ColumnaDrizzle = {
  exportName: string;
  tabla: string;
  campo: string;
  columna: string;
  tipo: string;
  nullable: boolean;
  defecto: string | null;
  primaryKey: boolean;
  unique: boolean;
  referencia: { tabla: string; columna: string } | null;
};

export type CruceCodigo = {
  tablasSinConsulta: string[];
  columnasConsultaAusentes: string[];
  diferenciasSchema: string[];
  sinLector: { tabla: string; columna: string }[];
  hashPagoLecturas: string[];
  hashPagoEscrituras: string[];
  credencialLecturas: string[];
  credencialEscrituras: string[];
  actualizarAceptaHash: boolean;
  actualizarAceptaCredencial: boolean;
  firmaGuardaHash: boolean;
  miembroComoUsuario: boolean;
  evidenciaIdUnica: boolean;
  idVeredictoIgualAEvidencia: boolean;
  memoriaIndexaPorEvidencia: boolean;
  upsertPorId: boolean;
  veredictoLimitSinOrden: boolean;
  exigirNoLeeIdentidad: boolean;
  neonNormalizaNoul: boolean;
  todasText: boolean;
  sinIndices: boolean;
  sinJournal: boolean;
  migrarLeeSql: boolean;
  sinCheck: boolean;
  emailUnicoTexto: boolean;
  emailEnMinusculas: boolean;
  blobSinTabla: boolean;
};

const CANDIDATAS_SIN_LECTOR: { tabla: string; columna: string; patrones: string[] }[] = [
  { tabla: "veredictos", columna: "tarea_id", patrones: ["veredicto.tareaId", "veredicto?.tareaId"] },
  { tabla: "veredictos", columna: "texto_scout", patrones: ["veredicto.textoScout", "veredicto?.textoScout"] },
  { tabla: "veredictos", columna: "choice", patrones: ["veredicto.choice", "veredicto?.choice"] },
  { tabla: "veredictos", columna: "noul", patrones: ["veredicto.noul", "veredicto?.noul"] },
  { tabla: "veredictos", columna: "score", patrones: ["veredicto.score", "veredicto?.score"] },
  { tabla: "veredictos", columna: "origen", patrones: ["veredicto.origen", "veredicto?.origen"] },
  { tabla: "sesiones", columna: "email", patrones: ["sesion.email", "sesion?.email"] },
  { tabla: "sesiones", columna: "usuario_id", patrones: ["sesion.usuarioId", "sesion?.usuarioId"] },
];

const FUERA_DE_LECTURA = new Set([
  "lib/db/neon.ts",
  "lib/db/schema.ts",
  "lib/db/tipos.ts",
  "lib/db/cruce-codigo.ts",
  "lib/db/correr-comparacion.ts",
  "lib/db/diff-esquema.ts",
  "lib/db/esquema-migracion.ts",
  "scripts/backend-traspaso/comparar-esquema.ts",
]);

export function construirCruce(raiz: string, esperado: EsquemaEsperado): CruceCodigo {
  const schemaFuente = leer(raiz, "lib/db/schema.ts");
  const neonFuente = leer(raiz, "lib/db/neon.ts");
  const leido = leerSchemaDrizzle(schemaFuente);
  const schema = leido.columnas;
  for (const aviso of leido.avisos) {
    if (!esperado.avisos.includes(aviso)) esperado.avisos.push(aviso);
  }
  const tocadas = tablasTocadas(neonFuente);
  const exportATabla = new Map(schema.map((columna) => [columna.exportName, columna.tabla]));
  const tablasConsulta = new Set(
    [...tocadas].map((nombre) => exportATabla.get(nombre) ?? nombre),
  );
  const tablasSinConsulta = [...new Set(esperado.tablas)].filter((tabla) => !tablasConsulta.has(tabla));
  const columnasConsultaAusentes = columnasNombradas(neonFuente, schema).filter((ref) => {
    if (ref.columna.startsWith("(")) return true;
    return !esperado.columnas.some((columna) => columna.tabla === ref.tabla && columna.nombre === ref.columna);
  }).map((ref) => `${ref.tabla}.${ref.columna}`);

  const sinLector = CANDIDATAS_SIN_LECTOR.filter((candidata) => {
    const existe = esperado.columnas.some((columna) => columna.tabla === candidata.tabla && columna.nombre === candidata.columna);
    if (!existe) return false;
    return candidata.patrones.every((patron) => buscar(raiz, patron).length === 0);
  }).map((candidata) => ({ tabla: candidata.tabla, columna: candidata.columna }));

  const hashEscrituras = escrituras(raiz, "hashPago").filter((item) => item.escribeValor && !item.archivo.endsWith(".test.ts"));
  const credencialEscrituras = escrituras(raiz, "credencialUrl").filter((item) => item.escribeValor && !item.archivo.endsWith(".test.ts"));
  const almacen = leer(raiz, "lib/db/almacen.ts");
  const firma = `${leer(raiz, "app/api/firma/route.ts")}\n${leer(raiz, "app/api/firma/enviar/route.ts")}`;
  const informe = leer(raiz, "lib/api/informe.ts");
  const exigir = leer(raiz, "lib/sesion/exigir.ts");
  const sql = esperado.archivos.map((archivo) => leer(raiz, join("drizzle", archivo))).join("\n");
  const veredictoDe = /async veredictoDe[\s\S]*?from\(veredictos\)([\s\S]*?)\n    },/.exec(neonFuente);
  const cuerpoVeredicto = veredictoDe?.[1] ?? "";

  return {
    tablasSinConsulta,
    columnasConsultaAusentes,
    diferenciasSchema: diferenciasSchema(schema, esperado),
    sinLector,
    hashPagoLecturas: buscar(raiz, "hashPago").filter((archivo) => !archivo.endsWith(".test.ts")),
    hashPagoEscrituras: hashEscrituras.map((item) => item.archivo),
    credencialLecturas: buscar(raiz, "credencialUrl").filter((archivo) => !archivo.endsWith(".test.ts")),
    credencialEscrituras: credencialEscrituras.map((item) => item.archivo),
    actualizarAceptaHash: almacen.includes('"hashPago"'),
    actualizarAceptaCredencial: almacen.includes('"credencialUrl"'),
    firmaGuardaHash: firma.includes("hashPago") || firma.includes("hash_pago"),
    miembroComoUsuario: informe.includes("tarea.miembroId") && informe.includes("usuario.id"),
    evidenciaIdUnica: esperado.uniques.some((grupo) => grupo.tabla === "veredictos" && grupo.columnas.length === 1 && grupo.columnas[0] === "evidencia_id"),
    idVeredictoIgualAEvidencia: leer(raiz, "lib/api/evidencias.ts").includes("id: evidenciaId"),
    memoriaIndexaPorEvidencia: leer(raiz, "lib/db/memoria.ts").includes("veredictos.set(veredicto.evidenciaId"),
    upsertPorId: neonFuente.includes("target: veredictos.id"),
    veredictoLimitSinOrden: cuerpoVeredicto.includes(".limit(1)") && !cuerpoVeredicto.includes("orderBy"),
    exigirNoLeeIdentidad: exigir.includes("sesion.rol") && exigir.includes("sesion.expiraEn") && !exigir.includes("sesion.email") && !exigir.includes("sesion.usuarioId"),
    neonNormalizaNoul: neonFuente.includes("fila.noul") && neonFuente.includes("fila.origen"),
    todasText: esperado.columnas.length > 0 && esperado.columnas.every((columna) => columna.tipo === "text"),
    sinIndices: esperado.indices.length === 0,
    sinJournal: !existsSync(join(raiz, "drizzle/meta")),
    migrarLeeSql: leer(raiz, "scripts/migrar.ts").includes("drizzle/0000_inicio.sql"),
    sinCheck: !/\bcheck\b/i.test(sql),
    emailUnicoTexto: esperado.columnas.some((columna) => columna.tabla === "usuarios" && columna.nombre === "email" && columna.unique && columna.tipo === "text"),
    emailEnMinusculas: neonFuente.includes("toLowerCase()"),
    blobSinTabla: esperado.columnas.some((columna) => columna.tabla === "evidencias" && columna.nombre === "blob_id" && !columna.referencia) && !esperado.tablas.includes("blobs"),
  };
}

export function lineasCruce(cruce: CruceCodigo): string[] {
  const lineas: string[] = ["Cruce del código con las migraciones"];
  if (cruce.columnasConsultaAusentes.length === 0 && cruce.tablasSinConsulta.length === 0) {
    lineas.push("Las tablas que lib/db/neon.ts consulta están en las migraciones, y cada columna que nombra también.");
  }
  for (const tabla of cruce.tablasSinConsulta) lineas.push(`La tabla ${tabla} está en las migraciones y neon.ts no la consulta.`);
  for (const columna of cruce.columnasConsultaAusentes) {
    lineas.push(`neon.ts nombra ${columna} y esa columna no está en las migraciones.`);
  }
  if (cruce.tablasSinConsulta.length === 0 && cruce.columnasConsultaAusentes.length === 0) {
    lineas.push("select() sin lista de columnas trae la fila entera. Cada columna declarada viaja en alguna consulta.");
  }
  if (cruce.diferenciasSchema.length === 0) {
    lineas.push("lib/db/schema.ts y las migraciones coinciden en tablas, columnas, nulabilidad, defaults, llaves, UNIQUE y FK.");
  }
  for (const diferencia of cruce.diferenciasSchema) lineas.push(diferencia);
  if (cruce.sinLector.length === 0) {
    lineas.push("Las columnas revisadas de veredictos y sesiones tienen algún lector fuera del adaptador.");
  } else {
    const lista = cruce.sinLector.map((columna) => `${columna.tabla}.${columna.columna}`).join(", ");
    lineas.push(`Columnas que se guardan y ninguna ruta lee: ${lista}.`);
    if (cruce.neonNormalizaNoul) {
      lineas.push("lib/db/neon.ts normaliza noul y origen al armar la fila. Después de eso nadie usa ese valor.");
    }
  }
  if (cruce.blobSinTabla) {
    lineas.push("evidencias.blob_id no referencia una tabla. Lo llena el almacén de fotos y en las migraciones no hay tabla blobs.");
  }
  return lineas;
}

export type Pendiente = { id: string; texto: string };

export function pendientesConEsteban(esperado: EsquemaEsperado, cruce: CruceCodigo): Pendiente[] {
  const pendientes: Pendiente[] = [];
  const fk = (tabla: string, columna: string) =>
    esperado.fks.some((item) => item.tabla === tabla && item.columnas.length === 1 && item.columnas[0] === columna);
  if (tiene(esperado, "veredictos", "tarea_id") && !fk("veredictos", "tarea_id") && fk("veredictos", "evidencia_id")) {
    pendientes.push({
      id: "fk-veredictos-tarea",
      texto: "veredictos.tarea_id se escribe desde guardarRevision y la migración no declara REFERENCES tareas (id). veredictos.evidencia_id sí referencia evidencias (id). Confirmar con Esteban si tarea_id debe ser FK y qué ON DELETE aplica.",
    });
  }
  if (tiene(esperado, "tareas", "miembro_id") && !fk("tareas", "miembro_id") && cruce.miembroComoUsuario) {
    pendientes.push({
      id: "fk-tareas-miembro",
      texto: "tareas.miembro_id no referencia usuarios (id). El informe lo usa como id de usuario. El default de la migración es cadena vacía, así que una FK estricta rechazaría una tarea sin miembro. Confirmar con Esteban si queda como texto libre.",
    });
  }
  if (tiene(esperado, "sesiones", "usuario_id") && !fk("sesiones", "usuario_id")) {
    pendientes.push({
      id: "fk-sesiones-usuario",
      texto: "sesiones.usuario_id no referencia usuarios (id). Confirmar con Esteban si esa relación va declarada.",
    });
  }
  if (cruce.sinLector.some((columna) => columna.tabla === "sesiones" && columna.columna === "email") && cruce.exigirNoLeeIdentidad) {
    pendientes.push({
      id: "sesiones-email",
      texto: "sesiones.email se copia al crear la sesión. exigirOrganizador lee rol y expira_en, no el email. Tampoco hay FK a usuarios (email). Confirmar con Esteban si la columna sigue haciendo falta.",
    });
  }
  if (cruce.sinLector.some((columna) => columna.tabla === "sesiones" && columna.columna === "usuario_id") && cruce.exigirNoLeeIdentidad) {
    pendientes.push({
      id: "sesiones-usuario-sin-lector",
      texto: "sesiones.usuario_id se copia al crear la sesión. exigirOrganizador no la lee. Confirmar con Esteban si hace falta guardarla.",
    });
  }
  if (tiene(esperado, "veredictos", "evidencia_id") && !cruce.evidenciaIdUnica && cruce.veredictoLimitSinOrden) {
    pendientes.push({
      id: "veredicto-evidencia-unica",
      texto: "veredictos.evidencia_id no es UNIQUE. veredictoDe filtra por esa columna con limit 1 y sin orden. Confirmar con Esteban si hay un veredicto por evidencia.",
    });
  }
  if (cruce.idVeredictoIgualAEvidencia && cruce.memoriaIndexaPorEvidencia && cruce.upsertPorId) {
    pendientes.push({
      id: "veredicto-id-compartido",
      texto: "guardarRevision usa el mismo valor para veredictos.id y veredictos.evidencia_id. La memoria indexa por evidenciaId y Neon hace upsert por id. Confirmar con Esteban si ese id compartido es la regla.",
    });
  }
  const sinLectorVeredicto = cruce.sinLector.filter((columna) => columna.tabla === "veredictos").map((columna) => columna.columna);
  if (sinLectorVeredicto.length > 0) {
    const nota = cruce.neonNormalizaNoul ? " neon.ts normaliza noul y origen al leer, y ningún llamador usa el resultado." : "";
    pendientes.push({
      id: "veredictos-sin-lector",
      texto: `Estas columnas de veredictos se guardan y ninguna ruta lee el valor: ${sinLectorVeredicto.join(", ")}. La respuesta usa veredicto y frase.${nota} Confirmar con Esteban si quedan para auditoría.`,
    });
  }
  const leeHash = ["lib/api/informe.ts", "lib/api/revision.ts"].filter((archivo) => cruce.hashPagoLecturas.includes(archivo));
  if (tiene(esperado, "tareas", "hash_pago") && leeHash.length > 0 && cruce.hashPagoEscrituras.length === 0 && !cruce.firmaGuardaHash) {
    const acepta = cruce.actualizarAceptaHash ? " actualizarTarea acepta el campo." : "";
    pendientes.push({
      id: "hash-pago-sin-escritura",
      texto: `tareas.hash_pago lo devuelven ${leeHash.join(" y ")}.${acepta} POST /api/firma y POST /api/firma/enviar no lo guardan. En la app no hay una asignación con un hash real: las altas lo dejan en null y el único valor no nulo está en un test. Confirmar con Esteban quién lo persiste.`,
    });
  }
  const pantallasCredencial = cruce.credencialLecturas.filter((archivo) => archivo.startsWith("components/admin/"));
  if (tiene(esperado, "tareas", "credencial_url") && cruce.credencialLecturas.includes("lib/api/informe.ts") && cruce.credencialEscrituras.length === 0) {
    const acepta = cruce.actualizarAceptaCredencial ? "actualizarTarea acepta el campo." : "actualizarTarea no acepta el campo.";
    const pantallas = pantallasCredencial.length > 0 ? ` ${pantallasCredencial.join(" y ")} muestran el enlace si la vista trae URL.` : "";
    pendientes.push({
      id: "credencial-url-sin-escritura",
      texto: `tareas.credencial_url la devuelve lib/api/informe.ts.${pantallas} Las altas la dejan en null. ${acepta} Ningún archivo de la app asigna una URL. Confirmar con Esteban quién la escribe.`,
    });
  }
  if (cruce.todasText) {
    pendientes.push({
      id: "tipos-text",
      texto: "Todas las columnas de las migraciones son text, incluidos monto, tope, creado_en, creada_en, fecha, expira_en y hash_pago. Confirmar con Esteban si el esquema que va a pasar sigue en text.",
    });
  }
  if (esperado.fks.length > 0 && esperado.fks.every((item) => !item.alBorrarExplicito)) {
    const lista = esperado.fks.map((item) => `${item.tabla}.${item.columnas.join(",")} → ${item.tablaRef}.${item.columnasRef.join(",")}`).join("; ");
    pendientes.push({
      id: "on-delete",
      texto: `Las FK declaradas (${lista}) no dicen ON DELETE ni ON UPDATE. En Postgres eso queda en NO ACTION. Confirmar con Esteban si es el comportamiento esperado.`,
    });
  }
  if (cruce.sinIndices) {
    pendientes.push({
      id: "sin-indices",
      texto: "Las migraciones no tienen CREATE INDEX. Además de las llaves, las consultas filtran por usuarios.email (hay UNIQUE), evidencias.tarea_id y veredictos.evidencia_id. Confirmar con Esteban si va a haber índices.",
    });
  }
  if (cruce.sinCheck) {
    pendientes.push({
      id: "sin-check",
      texto: "rol, tipo, estado y veredicto son text y la migración no declara CHECK. neon.ts convierte un valor desconocido a voluntario, trabajo, pendiente o parcial. Confirmar con Esteban si esos dominios quedan libres.",
    });
  }
  if (cruce.emailUnicoTexto && cruce.emailEnMinusculas) {
    pendientes.push({
      id: "email-case",
      texto: "usuarios.email es UNIQUE sobre text. La búsqueda pasa el correo a minúsculas antes de comparar. Confirmar con Esteban si los correos se guardan siempre en minúsculas.",
    });
  }
  if (cruce.sinJournal && cruce.migrarLeeSql) {
    pendientes.push({
      id: "fuente-sql",
      texto: "No hay drizzle/meta. npm run db:migrar ejecuta drizzle/0000_inicio.sql a mano. lib/db/schema.ts hoy coincide con ese archivo. Confirmar con Esteban si, al pasar sus migraciones, el SQL de drizzle/ sigue siendo lo que hay que comparar.",
    });
  }
  for (const diferencia of cruce.diferenciasSchema) {
    pendientes.push({ id: `schema-${pendientes.length}`, texto: `${diferencia} Confirmar con Esteban.` });
  }
  return pendientes;
}

export function leerSchemaDrizzle(fuente: string): { columnas: ColumnaDrizzle[]; avisos: string[] } {
  const bloques = [...fuente.matchAll(/export const (\w+) = pgTable\("(\w+)", \{([\s\S]*?)\n\}\);/g)];
  const columnas: ColumnaDrizzle[] = [];
  const avisos: string[] = [];
  for (const bloque of bloques) {
    const exportName = bloque[1];
    const tabla = bloque[2];
    const cuerpo = bloque[3];
    let actual: string[] | null = null;
    const campos: string[] = [];
    for (const linea of cuerpo.split("\n")) {
      if (/^\s{2}\w+:/.test(linea)) {
        if (actual) campos.push(actual.join("\n"));
        actual = [linea];
      } else if (actual) {
        actual.push(linea);
      }
    }
    if (actual) campos.push(actual.join("\n"));
    for (const campo of campos) {
      const texto = campo.trim().replace(/,\s*$/, "");
      const match = texto.match(/^(\w+):\s*(\w+)\(\s*"(\w+)"\s*(?:,\s*(\{[\s\S]*?\}))?\s*\)([\s\S]*)$/);
      if (!match) {
        const nombreCampo = /^(\w+)\s*:/.exec(texto);
        if (nombreCampo) {
          avisos.push(`No se reconoció la columna ${tabla}.${nombreCampo[1]} en schema.ts. Confirmar con Esteban.`);
        }
        continue;
      }
      const tipo = tipoBuilder(match[2], match[4]);
      if (!tipo) {
        avisos.push(`No se reconoció el builder ${match[2]}() de ${tabla}.${match[3]} en schema.ts. Confirmar con Esteban.`);
      }
      const resto = match[5];
      const referenciaCruda = /\.references\(\(\)\s*=>\s*(\w+)\.(\w+)\)/.exec(resto);
      const defecto = /\.default\(\s*"((?:\\.|[^"\\])*)"\s*\)/.exec(resto);
      columnas.push({
        exportName,
        tabla,
        campo: match[1],
        columna: match[3],
        tipo: tipo ? normalizarTipo(tipo) : "",
        nullable: !/\.notNull\(\)/.test(resto) && !/\.primaryKey\(\)/.test(resto),
        defecto: defecto ? `'${defecto[1].replace(/'/g, "''")}'` : null,
        primaryKey: /\.primaryKey\(\)/.test(resto),
        unique: /\.unique\(\)/.test(resto),
        referencia: referenciaCruda ? { tabla: referenciaCruda[1], columna: referenciaCruda[2] } : null,
      });
    }
  }
  const porExport = new Map<string, Map<string, string>>();
  for (const columna of columnas) {
    const campos = porExport.get(columna.exportName) ?? new Map<string, string>();
    campos.set(columna.campo, columna.columna);
    porExport.set(columna.exportName, campos);
  }
  for (const columna of columnas) {
    if (!columna.referencia) continue;
    const tabla = columnas.find((item) => item.exportName === columna.referencia?.tabla)?.tabla;
    const remota = porExport.get(columna.referencia.tabla)?.get(columna.referencia.columna);
    if (tabla && remota) columna.referencia = { tabla, columna: remota };
  }
  return { columnas, avisos };
}

function tipoBuilder(builder: string, config: string | undefined): string | null {
  const cfg = config ?? "";
  switch (builder) {
    case "text":
      return "text";
    case "integer":
    case "serial":
      return "integer";
    case "smallint":
    case "smallserial":
      return "smallint";
    case "bigint":
    case "bigserial":
      return "bigint";
    case "boolean":
      return "boolean";
    case "uuid":
      return "uuid";
    case "json":
      return "json";
    case "jsonb":
      return "jsonb";
    case "real":
      return "real";
    case "doublePrecision":
      return "double precision";
    case "date":
      return "date";
    case "time":
      return "time";
    case "bytea":
      return "bytea";
    case "varchar": {
      const largo = /length\s*:\s*(\d+)/.exec(cfg);
      return largo ? `character varying(${largo[1]})` : "character varying";
    }
    case "char": {
      const largo = /length\s*:\s*(\d+)/.exec(cfg);
      return largo ? `character(${largo[1]})` : "character";
    }
    case "numeric":
    case "decimal": {
      const precision = /precision\s*:\s*(\d+)/.exec(cfg);
      const escala = /scale\s*:\s*(\d+)/.exec(cfg);
      if (precision && escala) return `numeric(${precision[1]},${escala[1]})`;
      if (precision) return `numeric(${precision[1]})`;
      return "numeric";
    }
    case "timestamp":
      return /withTimezone\s*:\s*true/.test(cfg) ? "timestamp with time zone" : "timestamp without time zone";
    default:
      return null;
  }
}

function diferenciasSchema(schema: ColumnaDrizzle[], esperado: EsquemaEsperado): string[] {
  const diferencias: string[] = [];
  const tablasSchema = [...new Set(schema.map((columna) => columna.tabla))];
  for (const tabla of tablasSchema) {
    if (!esperado.tablas.includes(tabla)) diferencias.push(`schema.ts declara la tabla ${tabla} y las migraciones no.`);
  }
  for (const tabla of esperado.tablas) {
    if (!tablasSchema.includes(tabla)) diferencias.push(`Las migraciones declaran la tabla ${tabla} y schema.ts no.`);
  }
  for (const columna of schema) {
    const sql = esperado.columnas.find((item) => item.tabla === columna.tabla && item.nombre === columna.columna);
    if (!sql) {
      diferencias.push(`schema.ts declara ${columna.tabla}.${columna.columna} y las migraciones no.`);
      continue;
    }
    if (columna.tipo && sql.tipo !== columna.tipo) diferencias.push(`${columna.tabla}.${columna.columna}: schema.ts dice ${columna.tipo} y las migraciones ${sql.tipo}.`);
    if (sql.nullable !== columna.nullable) diferencias.push(`${columna.tabla}.${columna.columna}: la nulabilidad de schema.ts y la de las migraciones no coinciden.`);
    if (normalizarDefault(sql.defecto) !== normalizarDefault(columna.defecto)) {
      diferencias.push(`${columna.tabla}.${columna.columna}: el default de schema.ts y el de las migraciones no coinciden.`);
    }
    if (sql.primaryKey !== columna.primaryKey) diferencias.push(`${columna.tabla}.${columna.columna}: la llave primaria de schema.ts y la de las migraciones no coinciden.`);
    if (sql.unique !== columna.unique) diferencias.push(`${columna.tabla}.${columna.columna}: UNIQUE de schema.ts y el de las migraciones no coinciden.`);
    const fkSql = sql.referencia ? `${sql.referencia.tabla}.${sql.referencia.columna}` : "";
    const fkSchema = columna.referencia ? `${columna.referencia.tabla}.${columna.referencia.columna}` : "";
    if (fkSql !== fkSchema) diferencias.push(`${columna.tabla}.${columna.columna}: la FK de schema.ts (${fkSchema || "ninguna"}) y la de las migraciones (${fkSql || "ninguna"}) no coinciden.`);
  }
  for (const columna of esperado.columnas) {
    if (!schema.some((item) => item.tabla === columna.tabla && item.columna === columna.nombre)) {
      diferencias.push(`Las migraciones declaran ${columna.tabla}.${columna.nombre} y schema.ts no.`);
    }
  }
  return diferencias;
}

function columnasNombradas(neonFuente: string, schema: ColumnaDrizzle[]): { tabla: string; columna: string }[] {
  const porClave = new Map(schema.map((columna) => [`${columna.exportName}.${columna.campo}`, columna]));
  const vistos = new Map<string, { tabla: string; columna: string }>();
  for (const match of neonFuente.matchAll(/\b(usuarios|proyectos|tareas|evidencias|veredictos|sesiones)\.(\w+)/g)) {
    const columna = porClave.get(`${match[1]}.${match[2]}`);
    if (!columna) {
      vistos.set(`${match[1]}.${match[2]}`, { tabla: match[1], columna: `(campo ${match[2]} sin columna en schema.ts)` });
      continue;
    }
    vistos.set(`${columna.tabla}.${columna.columna}`, { tabla: columna.tabla, columna: columna.columna });
  }
  return [...vistos.values()];
}

function tablasTocadas(fuente: string): Set<string> {
  const nombres = new Set<string>();
  for (const match of fuente.matchAll(/\.(?:from|insert|update)\((\w+)\)/g)) nombres.add(match[1]);
  return nombres;
}

function tiene(esperado: EsquemaEsperado, tabla: string, columna: string): boolean {
  return esperado.columnas.some((item) => item.tabla === tabla && item.nombre === columna);
}

function buscar(raiz: string, patron: string): string[] {
  const encontrados: string[] = [];
  for (const archivo of fuentes(raiz)) {
    const relativa = rel(raiz, archivo);
    if (relativa.endsWith(".test.ts") || FUERA_DE_LECTURA.has(relativa)) continue;
    if (readFileSync(archivo, "utf8").includes(patron)) encontrados.push(relativa);
  }
  return encontrados;
}

function escrituras(raiz: string, campo: string): { archivo: string; escribeValor: boolean }[] {
  const re = new RegExp(`\\b${campo}\\s*:`);
  const proyectada = new RegExp(`\\b${campo}\\s*:\\s*[A-Za-z_][\\w]*\\.${campo}\\b`);
  const salida: { archivo: string; escribeValor: boolean }[] = [];
  for (const archivo of fuentes(raiz)) {
    const relativa = rel(raiz, archivo);
    if (FUERA_DE_LECTURA.has(relativa)) continue;
    for (const linea of readFileSync(archivo, "utf8").split("\n")) {
      if (!re.test(linea)) continue;
      const nula = /:\s*null\b/.test(linea);
      const esTipo = /:\s*string\b/.test(linea);
      const copia = proyectada.test(linea);
      salida.push({ archivo: relativa, escribeValor: !nula && !esTipo && !copia });
    }
  }
  return salida;
}

function fuentes(raiz: string): string[] {
  const salida: string[] = [];
  const pila = ["app", "components", "lib", "scripts"].map((dir) => join(raiz, dir));
  while (pila.length > 0) {
    const actual = pila.pop();
    if (!actual || !existsSync(actual)) continue;
    for (const entrada of readdirSync(actual)) {
      if (entrada === "node_modules" || entrada === ".next") continue;
      const ruta = join(actual, entrada);
      if (statSync(ruta).isDirectory()) pila.push(ruta);
      else if (entrada.endsWith(".ts") || entrada.endsWith(".tsx")) salida.push(ruta);
    }
  }
  return salida.sort();
}

function leer(raiz: string, relativa: string): string {
  return readFileSync(join(raiz, relativa), "utf8");
}

function rel(raiz: string, archivo: string): string {
  return relative(raiz, archivo).split(sep).join("/");
}
