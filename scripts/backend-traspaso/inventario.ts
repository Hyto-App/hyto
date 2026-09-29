import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as esquema from "../../lib/db/schema";
import { parsearSql, type ClaveForaneaSql, type ColumnaSql, type IndiceSql, type TablaSql } from "./leer-sql";

const CONFIRMAR = "confirmar con Esteban" as const;

export type CampoAplicacion = {
  archivo: "lib/db/tipos.ts";
  tipo: string;
  campo: string;
  tipoTs: string;
  literales: string[] | null;
  aceptaNull: boolean;
  esCheckDeLaBase: false;
  nota: string;
};

export type ClaveForaneaInventario = {
  columnas: string[];
  tabla: string;
  columnasReferenciadas: string[];
  esquemaDestino: string | null;
  onDeleteEnSql: string | null;
  onUpdateEnSql: string | null;
  onDeleteEnDrizzle: string | null;
  onUpdateEnDrizzle: string | null;
  onDeleteEscritoEnSchemaTs: boolean;
  onUpdateEscritoEnSchemaTs: boolean;
  nombreEnSql: string | null;
  nombreGeneradoPorDrizzleOrm: string | null;
  nombreEscritoEnSchemaTs: boolean;
  nombreEnNeon: typeof CONFIRMAR;
};

export type ColumnaInventario = {
  nombre: string;
  nombreEnDrizzle: string | null;
  tipoSql: string;
  tipoDrizzle: string | null;
  claseDrizzle: string | null;
  aceptaNull: boolean;
  aceptaNullEnDrizzle: boolean | null;
  notNullExplicitoEnSql: boolean;
  esLlavePrimaria: boolean;
  esUnico: boolean;
  nombreUnicoEnSql: string | null;
  nombreUnicoGeneradoPorDrizzleOrm: string | null;
  nombreUnicoEscritoEnSchemaTs: boolean;
  nombreUnicoEnNeon: typeof CONFIRMAR | null;
  defaultSql: string | null;
  defaultDeclaradoEnSql: boolean;
  defaultEsNullEnSql: boolean;
  defaultDrizzle: string | number | boolean | null;
  defaultDeclaradoEnDrizzle: boolean;
  claveForanea: ClaveForaneaInventario | null;
  checksEnSql: string[];
  tipoAplicacion: CampoAplicacion | { nota: typeof CONFIRMAR };
};

export type IndiceInventario = {
  nombre: string;
  unico: boolean;
  metodo: string | null;
  columnas: { nombre: string; orden: "asc" | "desc" | null }[];
  origen: "sql" | "drizzle";
  archivo: string;
};

export type TablaInventario = {
  nombre: string;
  esquemaPostgres: string | null;
  archivoMigracion: string;
  archivoOrm: "lib/db/schema.ts" | null;
  exportDrizzle: string | null;
  ifNotExists: boolean;
  rlsEnDrizzle: boolean;
  columnas: ColumnaInventario[];
  llavePrimaria: {
    columnas: string[];
    nombreEnSql: string | null;
    nombreEnNeon: typeof CONFIRMAR;
    createIndexEnLaMigracion: boolean;
  };
  unicos: {
    columnas: string[];
    nombreEnSql: string | null;
    nombreGeneradoPorDrizzleOrm: string | null;
    nombreEnNeon: typeof CONFIRMAR;
  }[];
  clavesForaneas: ClaveForaneaInventario[];
  indices: IndiceInventario[];
  checks: { nombre: string | null; expresion: string; origen: "sql" | "drizzle" }[];
};

export type ArchivoInventario = {
  ruta: string;
  rol: "migracion" | "esquema" | "configuracion" | "aplicador" | "journal";
  presente: boolean;
  lenguaje: string;
  ormOSql: string;
  sha256: string | null;
  detalle: Record<string, unknown>;
};

export type Inventario = {
  versionInventario: 1;
  generadoPor: "scripts/backend-traspaso/generar-esquema.ts";
  consultaANeon: false;
  motor: {
    baseDeDatos: "PostgreSQL";
    proveedorEnCodigo: "Neon, vía @neondatabase/serverless en scripts/migrar.ts y drizzle-orm/neon-http en lib/db/neon.ts";
    orm: "drizzle-orm";
    kit: "drizzle-kit";
    versiones: Record<string, { rangoEnPackageJson: string | null; versionEnPackageLock: string | null }>;
    dialectoDrizzleKit: string | null;
    esquemaPostgres: string | null;
    notaEsquemaPostgres: string;
  };
  archivos: ArchivoInventario[];
  tablas: TablaInventario[];
  relaciones: {
    desde: { tabla: string; columnas: string[] };
    hacia: { tabla: string; columnas: string[] };
    declaradaEnSql: true;
    declaradaEnDrizzle: boolean;
    onDeleteEnSql: string | null;
    onUpdateEnSql: string | null;
    nombreEnSql: string | null;
    nombreEnNeon: typeof CONFIRMAR;
  }[];
  columnasIdSinFk: {
    tabla: string;
    columna: string;
    tablasDestinoEnElEsquema: string[];
    nota: string;
  }[];
  comparacionSqlYDrizzle: {
    coinciden: boolean;
    diferencias: string[];
  };
  sentenciasNoParseadas: { archivo: string; sql: string; nota: string }[];
  pendientesConEsteban: string[];
};

type ColumnaDrizzle = {
  nombre: string;
  propiedad: string;
  tipo: string;
  clase: string;
  notNull: boolean;
  pk: boolean;
  unico: boolean;
  nombreUnico: string | null;
  tieneDefault: boolean;
  valorDefault: string | number | boolean | null;
  defaultOpaco: boolean;
};

type ForaneaDrizzle = {
  columnas: string[];
  tabla: string;
  columnasReferenciadas: string[];
  onDelete: string | null;
  onUpdate: string | null;
  nombre: string;
};

type TablaDrizzle = {
  exportacion: string;
  nombre: string;
  esquema: string | null;
  rls: boolean;
  columnas: ColumnaDrizzle[];
  foraneas: ForaneaDrizzle[];
  indices: IndiceInventario[];
  checks: { nombre: string; expresion: typeof CONFIRMAR }[];
  llavesPrimariasDeTabla: string[][];
  unicosDeTabla: { columnas: string[]; nombre: string | null }[];
};

type TablaDrizzleLista = {
  tablas: TablaDrizzle[];
  otrasExportaciones: string[];
};

type CampoLeido = {
  tipo: string;
  campo: string;
  tipoTs: string;
  literales: string[] | null;
  aceptaNull: boolean;
  desconocido: boolean;
};

function sha256(texto: string): string {
  return createHash("sha256").update(texto).digest("hex");
}

function leerJson(raiz: string, ruta: string): unknown {
  return JSON.parse(readFileSync(path.join(raiz, ruta), "utf8")) as unknown;
}

function versionDe(lock: unknown, nombre: string): string | null {
  if (!lock || typeof lock !== "object") return null;
  const packages = (lock as { packages?: unknown }).packages;
  if (!packages || typeof packages !== "object") return null;
  const entrada = (packages as Record<string, unknown>)[`node_modules/${nombre}`];
  if (!entrada || typeof entrada !== "object") return null;
  const version = (entrada as { version?: unknown }).version;
  return typeof version === "string" ? version : null;
}

function rangoDe(pkg: unknown, nombre: string): string | null {
  if (!pkg || typeof pkg !== "object") return null;
  const cuerpo = pkg as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  return cuerpo.dependencies?.[nombre] ?? cuerpo.devDependencies?.[nombre] ?? null;
}

function leerDrizzleConfig(texto: string): { schema: string | null; out: string | null; dialect: string | null; mencionaDatabaseUrl: boolean } {
  const tomar = (clave: string) => {
    const coincidencia = texto.match(new RegExp(`${clave}\\s*:\\s*"([^"]*)"`));
    return coincidencia?.[1] ?? null;
  };
  return {
    schema: tomar("schema"),
    out: tomar("out"),
    dialect: tomar("dialect"),
    mencionaDatabaseUrl: texto.includes("DATABASE_URL"),
  };
}

function archivosSql(raiz: string): string[] {
  const directorio = path.join(raiz, "drizzle");
  if (!existsSync(directorio)) return [];
  return readdirSync(directorio)
    .filter((nombre) => nombre.endsWith(".sql"))
    .sort()
    .map((nombre) => path.posix.join("drizzle", nombre));
}

function archivosQueLeeMigrar(texto: string): string[] {
  return [...texto.matchAll(/readFileSync\(\s*["']([^"']+)["']/g)].map((coincidencia) => coincidencia[1] ?? "").filter(Boolean);
}

function valorDefaultDrizzle(valor: unknown): { valor: string | number | boolean | null; opaco: boolean } {
  if (valor === undefined) return { valor: null, opaco: false };
  if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean" || valor === null) {
    return { valor, opaco: false };
  }
  return { valor: null, opaco: true };
}

function leerTablasDrizzle(): TablaDrizzleLista {
  const columnasSimbolo = Symbol.for("drizzle:Columns");
  const tablas: TablaDrizzle[] = [];
  const otrasExportaciones: string[] = [];
  for (const [exportacion, valor] of Object.entries(esquema)) {
    if (!is(valor, PgTable)) {
      otrasExportaciones.push(exportacion);
      continue;
    }
    const config = getTableConfig(valor);
    const mapa =
      (valor as unknown as Record<symbol, Record<string, { name: string }>>)[columnasSimbolo] ?? {};
    const propiedadPorNombre = new Map<string, string>();
    for (const [propiedad, columna] of Object.entries(mapa)) propiedadPorNombre.set(columna.name, propiedad);
    const columnas: ColumnaDrizzle[] = config.columns.map((columna) => {
      const defecto = valorDefaultDrizzle(columna.default);
      const nombreUnico = columna.isUnique ? columna.uniqueName ?? null : null;
      return {
        nombre: columna.name,
        propiedad: propiedadPorNombre.get(columna.name) ?? columna.name,
        tipo: columna.getSQLType(),
        clase: columna.columnType,
        notNull: columna.notNull,
        pk: columna.primary,
        unico: columna.isUnique,
        nombreUnico,
        tieneDefault: columna.hasDefault,
        valorDefault: defecto.valor,
        defaultOpaco: defecto.opaco,
      };
    });
    const foraneas: ForaneaDrizzle[] = config.foreignKeys.map((clave) => {
      const referencia = clave.reference();
      return {
        columnas: referencia.columns.map((columna) => columna.name),
        tabla: getTableConfig(referencia.foreignTable).name,
        columnasReferenciadas: referencia.foreignColumns.map((columna) => columna.name),
        onDelete: clave.onDelete ?? null,
        onUpdate: clave.onUpdate ?? null,
        nombre: clave.getName(),
      };
    });
    const indices: IndiceInventario[] = config.indexes.map((indice) => ({
      nombre: indice.config.name ?? CONFIRMAR,
      unico: indice.config.unique,
      metodo: indice.config.method ?? null,
      columnas: indice.config.columns.map((columna) => {
        if (columna && typeof columna === "object" && "name" in columna && typeof columna.name === "string") {
          return { nombre: columna.name, orden: null };
        }
        return { nombre: CONFIRMAR, orden: null };
      }),
      origen: "drizzle" as const,
      archivo: "lib/db/schema.ts",
    }));
    tablas.push({
      exportacion,
      nombre: config.name,
      esquema: config.schema ?? null,
      rls: config.enableRLS,
      columnas,
      foraneas,
      indices,
      checks: config.checks.map((check) => ({ nombre: check.name, expresion: CONFIRMAR })),
      llavesPrimariasDeTabla: config.primaryKeys.map((llave) => llave.columns.map((columna) => columna.name)),
      unicosDeTabla: config.uniqueConstraints.map((unico) => ({
        columnas: unico.columns.map((columna) => columna.name),
        nombre: unico.name ?? unico.getName() ?? null,
      })),
    });
  }
  return { tablas, otrasExportaciones };
}

function literalesDe(tipo: ts.Type): { literales: string[] | null; desconocido: boolean; libre: boolean } {
  if (tipo.isUnion()) {
    const partes = tipo.types.map((parte) => literalesDe(parte));
    if (partes.some((parte) => parte.desconocido || parte.libre)) return { literales: null, desconocido: partes.some((parte) => parte.desconocido), libre: true };
    return { literales: partes.flatMap((parte) => parte.literales ?? []), desconocido: false, libre: false };
  }
  if (tipo.isStringLiteral()) return { literales: [tipo.value], desconocido: false, libre: false };
  if (tipo.flags & ts.TypeFlags.String) return { literales: null, desconocido: false, libre: true };
  if (tipo.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Never)) {
    return { literales: [], desconocido: false, libre: false };
  }
  return { literales: null, desconocido: true, libre: false };
}

function leerTiposAplicacion(raiz: string): Map<string, CampoLeido[]> | { nota: typeof CONFIRMAR } {
  const archivo = path.join(raiz, "lib/db/tipos.ts");
  const programa = ts.createProgram({
    rootNames: [archivo],
    options: {
      strict: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      baseUrl: raiz,
      paths: { "@/*": ["./*"] },
      noEmit: true,
      skipLibCheck: true,
    },
  });
  const checker = programa.getTypeChecker();
  const fuente = programa.getSourceFile(archivo);
  if (!fuente) return { nota: CONFIRMAR };
  const tipos = new Map<string, CampoLeido[]>();
  const visitar = (nodo: ts.Node): void => {
    if (ts.isTypeAliasDeclaration(nodo) && ts.isTypeLiteralNode(nodo.type)) {
      const tipo = checker.getTypeAtLocation(nodo);
      const campos: CampoLeido[] = [];
      for (const propiedad of tipo.getProperties()) {
        const declaracion = propiedad.valueDeclaration ?? propiedad.declarations?.[0];
        if (!declaracion) continue;
        const tipoPropiedad = checker.getTypeOfSymbolAtLocation(propiedad, declaracion);
        const aceptaNull = Boolean(tipoPropiedad.isUnion() && tipoPropiedad.types.some((parte) => parte.flags & ts.TypeFlags.Null));
        const sinNulo = tipoPropiedad.getNonNullableType();
        const leido = literalesDe(sinNulo);
        campos.push({
          tipo: nodo.name.text,
          campo: propiedad.getName(),
          tipoTs: checker.typeToString(sinNulo),
          literales: leido.libre || leido.desconocido ? null : leido.literales,
          aceptaNull,
          desconocido: leido.desconocido,
        });
      }
      tipos.set(nodo.name.text, campos);
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return tipos;
}

function mismoConjunto(izquierda: string[], derecha: string[]): boolean {
  if (izquierda.length !== derecha.length) return false;
  const ordenadaIzquierda = [...izquierda].sort();
  const ordenadaDerecha = [...derecha].sort();
  return ordenadaIzquierda.every((valor, indice) => valor === ordenadaDerecha[indice]);
}

function buscarForaneaDrizzle(tabla: TablaDrizzle | undefined, columnas: string[]): ForaneaDrizzle | null {
  if (!tabla) return null;
  return tabla.foraneas.find((clave) => mismoConjunto(clave.columnas, columnas)) ?? null;
}

function escaparRegExp(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extraerBalanceado(texto: string, inicio: number, abre: string, cierra: string): string {
  if (texto[inicio] !== abre) return "";
  let profundidad = 0;
  for (let i = inicio; i < texto.length; i++) {
    if (texto[i] === abre) profundidad++;
    else if (texto[i] === cierra) {
      profundidad--;
      if (profundidad === 0) return texto.slice(inicio, i + 1);
    }
  }
  return texto.slice(inicio);
}

function cuerpoDeColumnas(fuenteSchema: string, tabla: string): string {
  const patron = new RegExp(`pgTable\\(\\s*["']${escaparRegExp(tabla)}["']`);
  const coincidencia = patron.exec(fuenteSchema);
  if (!coincidencia) return "";
  const llave = fuenteSchema.indexOf("{", coincidencia.index + coincidencia[0].length);
  if (llave < 0) return "";
  return extraerBalanceado(fuenteSchema, llave, "{", "}");
}

function cadenaDeLaColumna(bloque: string, desde: number): string {
  let profundidad = 0;
  for (let i = desde; i < bloque.length; i++) {
    const caracter = bloque[i];
    if (caracter === "(" || caracter === "{" || caracter === "[") profundidad++;
    else if (caracter === ")" || caracter === "}" || caracter === "]") {
      profundidad--;
      if (profundidad < 0) return bloque.slice(desde, i);
    } else if (caracter === "," && profundidad === 0) return bloque.slice(desde, i);
  }
  return bloque.slice(desde);
}

export function fragmentoDeColumnaEnSchema(fuenteSchema: string, tabla: string, columna: string): string {
  const cuerpo = cuerpoDeColumnas(fuenteSchema, tabla);
  const patron = new RegExp(`\\b\\w+\\(\\s*["']${escaparRegExp(columna)}["']`);
  const coincidencia = patron.exec(cuerpo);
  if (!coincidencia) return "";
  return cadenaDeLaColumna(cuerpo, coincidencia.index);
}

export function accionesEscritasEnColumna(fuenteSchema: string, tabla: string, columna: string): { onDelete: boolean; onUpdate: boolean } {
  const fragmento = fragmentoDeColumnaEnSchema(fuenteSchema, tabla, columna);
  return { onDelete: fragmento.includes("onDelete"), onUpdate: fragmento.includes("onUpdate") };
}

function foraneaInventario(sql: ClaveForaneaSql, drizzle: ForaneaDrizzle | null, fuenteSchema: string, tablaOrigen: string): ClaveForaneaInventario {
  const nombreDrizzle = drizzle?.nombre ?? null;
  const acciones = sql.columnas.map((columna) => accionesEscritasEnColumna(fuenteSchema, tablaOrigen, columna));
  return {
    columnas: sql.columnas,
    tabla: sql.tabla,
    columnasReferenciadas: sql.columnasReferenciadas,
    esquemaDestino: sql.esquema,
    onDeleteEnSql: sql.onDelete,
    onUpdateEnSql: sql.onUpdate,
    onDeleteEnDrizzle: drizzle?.onDelete ?? null,
    onUpdateEnDrizzle: drizzle?.onUpdate ?? null,
    onDeleteEscritoEnSchemaTs: acciones.some((accion) => accion.onDelete),
    onUpdateEscritoEnSchemaTs: acciones.some((accion) => accion.onUpdate),
    nombreEnSql: sql.nombre,
    nombreGeneradoPorDrizzleOrm: nombreDrizzle,
    nombreEscritoEnSchemaTs: nombreDrizzle ? fuenteSchema.includes(nombreDrizzle) : false,
    nombreEnNeon: CONFIRMAR,
  };
}

function campoAplicacion(campos: CampoLeido[] | undefined, propiedad: string | null): CampoAplicacion | { nota: typeof CONFIRMAR } {
  if (!campos || !propiedad) return { nota: CONFIRMAR };
  const campo = campos.find((item) => item.campo === propiedad);
  if (!campo) return { nota: CONFIRMAR };
  const nota = campo.desconocido
    ? CONFIRMAR
    : campo.literales
      ? "Unión de literales en TypeScript. La migración no declara CHECK ni enum de Postgres."
      : "En la aplicación es string. La columna SQL es text sin CHECK.";
  return {
    archivo: "lib/db/tipos.ts",
    tipo: campo.tipo,
    campo: campo.campo,
    tipoTs: campo.tipoTs,
    literales: campo.literales,
    aceptaNull: campo.aceptaNull,
    esCheckDeLaBase: false,
    nota,
  };
}

function candidatosId(stem: string, tablas: Set<string>): string[] {
  return [stem, `${stem}s`, `${stem}es`].filter((nombre) => tablas.has(nombre));
}

function columnaInventario(
  sql: ColumnaSql,
  drizzle: ColumnaDrizzle | undefined,
  foranea: ClaveForaneaInventario | null,
  aplicacion: CampoAplicacion | { nota: typeof CONFIRMAR },
  fuenteSchema: string,
): ColumnaInventario {
  const nombreUnicoDrizzle = drizzle?.unico ? drizzle.nombreUnico : null;
  return {
    nombre: sql.nombre,
    nombreEnDrizzle: drizzle?.propiedad ?? null,
    tipoSql: sql.tipo,
    tipoDrizzle: drizzle?.tipo ?? null,
    claseDrizzle: drizzle?.clase ?? null,
    aceptaNull: !sql.notNullExplicito && !sql.pk,
    aceptaNullEnDrizzle: drizzle ? !drizzle.notNull : null,
    notNullExplicitoEnSql: sql.notNullExplicito,
    esLlavePrimaria: sql.pk,
    esUnico: sql.unico,
    nombreUnicoEnSql: sql.nombreUnico,
    nombreUnicoGeneradoPorDrizzleOrm: nombreUnicoDrizzle,
    nombreUnicoEscritoEnSchemaTs: nombreUnicoDrizzle ? fuenteSchema.includes(nombreUnicoDrizzle) : false,
    nombreUnicoEnNeon: sql.unico ? CONFIRMAR : null,
    defaultSql: sql.default.texto,
    defaultDeclaradoEnSql: sql.default.declarado,
    defaultEsNullEnSql: sql.default.esNull,
    defaultDrizzle: drizzle?.tieneDefault ? drizzle.valorDefault : null,
    defaultDeclaradoEnDrizzle: drizzle?.tieneDefault ?? false,
    claveForanea: foranea,
    checksEnSql: sql.checks,
    tipoAplicacion: aplicacion,
  };
}

function comparar(
  tablaSql: TablaSql,
  tablaDrizzle: TablaDrizzle | undefined,
  columnas: ColumnaInventario[],
): string[] {
  const diferencias: string[] = [];
  if (!tablaDrizzle) {
    diferencias.push(`${tablaSql.nombre}: está en SQL y no en lib/db/schema.ts`);
    return diferencias;
  }
  const nombresSql = tablaSql.columnas.map((columna) => columna.nombre);
  const nombresDrizzle = tablaDrizzle.columnas.map((columna) => columna.nombre);
  if (nombresSql.join(",") !== nombresDrizzle.join(",")) {
    diferencias.push(`${tablaSql.nombre}: columnas SQL [${nombresSql.join(", ")}] y Drizzle [${nombresDrizzle.join(", ")}]`);
  }
  for (const columna of columnas) {
    const par = tablaDrizzle.columnas.find((item) => item.nombre === columna.nombre);
    if (!par) continue;
    if (columna.tipoSql.toLowerCase() !== par.tipo.toLowerCase()) {
      diferencias.push(`${tablaSql.nombre}.${columna.nombre}: tipo SQL ${columna.tipoSql} y Drizzle ${par.tipo}`);
    }
    if (columna.aceptaNull !== !par.notNull) {
      diferencias.push(`${tablaSql.nombre}.${columna.nombre}: nulidad SQL aceptaNull=${columna.aceptaNull} y Drizzle notNull=${par.notNull}`);
    }
    if (columna.esLlavePrimaria !== par.pk) {
      diferencias.push(`${tablaSql.nombre}.${columna.nombre}: llave primaria distinta`);
    }
    if (columna.esUnico !== par.unico) {
      diferencias.push(`${tablaSql.nombre}.${columna.nombre}: UNIQUE distinto`);
    }
    const defaultSql = !columna.defaultDeclaradoEnSql ? null : columna.defaultEsNullEnSql ? null : columna.defaultSql;
    const defaultDrizzle = par.tieneDefault ? (par.defaultOpaco ? CONFIRMAR : par.valorDefault) : null;
    if (par.defaultOpaco) {
      diferencias.push(`${tablaSql.nombre}.${columna.nombre}: el default de Drizzle no es un literal. ${CONFIRMAR}`);
    } else if (defaultSql !== defaultDrizzle && String(defaultSql) !== String(defaultDrizzle)) {
      diferencias.push(`${tablaSql.nombre}.${columna.nombre}: default SQL ${JSON.stringify(defaultSql)} y Drizzle ${JSON.stringify(defaultDrizzle)}`);
    }
    const fkSql = columna.claveForanea;
    const fkDrizzle = buscarForaneaDrizzle(tablaDrizzle, [columna.nombre]);
    if (Boolean(fkSql) !== Boolean(fkDrizzle)) {
      diferencias.push(`${tablaSql.nombre}.${columna.nombre}: la clave foránea no está en las dos fuentes`);
    } else if (fkSql && fkDrizzle) {
      if (fkSql.tabla !== fkDrizzle.tabla || !mismoConjunto(fkSql.columnasReferenciadas, fkDrizzle.columnasReferenciadas)) {
        diferencias.push(`${tablaSql.nombre}.${columna.nombre}: la clave foránea apunta a destinos distintos`);
      }
    }
  }
  for (const foranea of tablaDrizzle.foraneas) {
    if (foranea.columnas.length !== 1) {
      const sqlCompuesta = tablaSql.restricciones.find(
        (restriccion) => restriccion.tipo === "foreign key" && mismoConjunto(restriccion.columnas, foranea.columnas),
      );
      if (!sqlCompuesta) diferencias.push(`${tablaSql.nombre}: Drizzle tiene una FK compuesta (${foranea.columnas.join(", ")}) que el SQL no declara`);
    }
  }
  for (const restriccion of tablaSql.restricciones) {
    if (restriccion.tipo !== "foreign key" || restriccion.columnas.length === 1) continue;
    const enDrizzle = tablaDrizzle.foraneas.some((foranea) => mismoConjunto(foranea.columnas, restriccion.columnas));
    if (!enDrizzle) diferencias.push(`${tablaSql.nombre}: el SQL tiene una FK compuesta (${restriccion.columnas.join(", ")}) que Drizzle no declara`);
  }
  return diferencias;
}

export function armarInventario(raiz: string): Inventario {
  const pkg = leerJson(raiz, "package.json");
  const lock = leerJson(raiz, "package-lock.json");
  const fuenteSchema = readFileSync(path.join(raiz, "lib/db/schema.ts"), "utf8");
  const fuenteConfig = readFileSync(path.join(raiz, "drizzle.config.ts"), "utf8");
  const fuenteMigrar = readFileSync(path.join(raiz, "scripts/migrar.ts"), "utf8");
  const config = leerDrizzleConfig(fuenteConfig);
  const leidosPorMigrar = archivosQueLeeMigrar(fuenteMigrar);
  const usaNeon = fuenteMigrar.includes('from "@neondatabase/serverless"');
  const drizzle = leerTablasDrizzle();
  const tipos = leerTiposAplicacion(raiz);
  const sqls = archivosSql(raiz);
  const sentenciasNoParseadas: Inventario["sentenciasNoParseadas"] = [];
  const tablasSql: { archivo: string; tabla: TablaSql }[] = [];
  const indicesSql: { archivo: string; indice: IndiceSql }[] = [];

  for (const relativo of sqls) {
    const texto = readFileSync(path.join(raiz, relativo), "utf8");
    for (const sentencia of parsearSql(texto)) {
      if (sentencia.tipo === "tabla") tablasSql.push({ archivo: relativo, tabla: sentencia.tabla });
      else if (sentencia.tipo === "indice") indicesSql.push({ archivo: relativo, indice: sentencia.indice });
      else sentenciasNoParseadas.push({ archivo: relativo, sql: sentencia.sql, nota: sentencia.nota });
    }
  }

  const archivos: ArchivoInventario[] = [
    {
      ruta: "lib/db/schema.ts",
      rol: "esquema",
      presente: true,
      lenguaje: "TypeScript",
      ormOSql: "Drizzle ORM (drizzle-orm/pg-core, pgTable)",
      sha256: sha256(fuenteSchema),
      detalle: {
        exportacionesDeTabla: drizzle.tablas.map((tabla) => tabla.exportacion),
        otrasExportaciones: drizzle.otrasExportaciones,
        loImporta: "lib/db/neon.ts",
      },
    },
    {
      ruta: "drizzle.config.ts",
      rol: "configuracion",
      presente: true,
      lenguaje: "TypeScript",
      ormOSql: "drizzle-kit",
      sha256: sha256(fuenteConfig),
      detalle: {
        schema: config.schema,
        out: config.out,
        dialect: config.dialect,
        dbCredentials: config.mencionaDatabaseUrl
          ? "El archivo referencia DATABASE_URL. Este inventario no lee el valor ni abre una conexión."
          : CONFIRMAR,
      },
    },
    {
      ruta: "scripts/migrar.ts",
      rol: "aplicador",
      presente: true,
      lenguaje: "TypeScript",
      ormOSql: usaNeon ? "SQL ejecutado con @neondatabase/serverless. No usa drizzle-kit migrate." : CONFIRMAR,
      sha256: sha256(fuenteMigrar),
      detalle: {
        archivosQueLee: leidosPorMigrar,
        parteSentenciasCon: "lib/db/sql.ts sentencias()",
      },
    },
    {
      ruta: "drizzle/meta/_journal.json",
      rol: "journal",
      presente: existsSync(path.join(raiz, "drizzle/meta/_journal.json")),
      lenguaje: "json",
      ormOSql: "drizzle-kit",
      sha256: null,
      detalle: {
        nota: existsSync(path.join(raiz, "drizzle/meta/_journal.json"))
          ? "Está en el repositorio."
          : `No está en el repositorio. ${CONFIRMAR}`,
      },
    },
  ];

  for (const relativo of sqls) {
    const texto = readFileSync(path.join(raiz, relativo), "utf8");
    const loLeeMigrar = leidosPorMigrar.includes(relativo);
    archivos.push({
      ruta: relativo,
      rol: "migracion",
      presente: true,
      lenguaje: "SQL",
      ormOSql: "SQL de PostgreSQL. Lo aplica scripts/migrar.ts. No hay journal de drizzle-kit en el repositorio.",
      sha256: sha256(texto),
      detalle: {
        loEjecutaMigrarTs: loLeeMigrar,
        nota: loLeeMigrar
          ? "scripts/migrar.ts lo lee con readFileSync y ejecuta cada sentencia."
          : `Está en drizzle/ y scripts/migrar.ts no lo lee. ${CONFIRMAR}`,
      },
    });
  }

  const nombresTablas = new Set(tablasSql.map((item) => item.tabla.nombre));
  const diferencias: string[] = [];
  if (sentenciasNoParseadas.length > 0) {
    diferencias.push(`Hay sentencias SQL sin parsear. ${CONFIRMAR}`);
  }
  if (drizzle.otrasExportaciones.length > 0) {
    diferencias.push(`schema.ts exporta valores que no son tablas: ${drizzle.otrasExportaciones.join(", ")}. ${CONFIRMAR}`);
  }

  const tablas: TablaInventario[] = tablasSql.map(({ archivo, tabla }) => {
    const par = drizzle.tablas.find((item) => item.nombre === tabla.nombre);
    const campos =
      tipos instanceof Map && par
        ? [...tipos.entries()].filter(([, lista]) => {
            const nombres = new Set(lista.map((campo) => campo.campo));
            return par.columnas.every((columna) => nombres.has(columna.propiedad)) && nombres.size === par.columnas.length;
          })
        : [];
    const tipoElegido = campos.length === 1 ? campos[0]?.[1] : undefined;
    if (par && tipos instanceof Map && campos.length !== 1) {
      diferencias.push(`${tabla.nombre}: no hay un único tipo de lib/db/tipos.ts con los mismos campos. ${CONFIRMAR}`);
    }
    const columnas = tabla.columnas.map((columna) => {
      const columnaDrizzle = par?.columnas.find((item) => item.nombre === columna.nombre);
      const foraneaSql = columna.claveForanea;
      const foraneaDrizzle = foraneaSql ? buscarForaneaDrizzle(par, foraneaSql.columnas) : null;
      const foranea = foraneaSql ? foraneaInventario(foraneaSql, foraneaDrizzle, fuenteSchema, tabla.nombre) : null;
      return columnaInventario(
        columna,
        columnaDrizzle,
        foranea,
        campoAplicacion(tipoElegido, columnaDrizzle?.propiedad ?? null),
        fuenteSchema,
      );
    });
    diferencias.push(...comparar(tabla, par, columnas));
    const pkSql = tabla.restricciones.find((restriccion) => restriccion.tipo === "primary key");
    const pkColumnas = tabla.columnas.filter((columna) => columna.pk).map((columna) => columna.nombre);
    if (par) {
      const pkDrizzle = par.columnas.filter((columna) => columna.pk).map((columna) => columna.nombre);
      if (!mismoConjunto(pkColumnas, pkDrizzle) && par.llavesPrimariasDeTabla.length === 0) {
        diferencias.push(`${tabla.nombre}: llave primaria SQL [${pkColumnas.join(", ")}] y Drizzle [${pkDrizzle.join(", ")}]`);
      }
      for (const llave of par.llavesPrimariasDeTabla) {
        if (!mismoConjunto(llave, pkColumnas)) {
          diferencias.push(`${tabla.nombre}: primaryKey de tabla en Drizzle [${llave.join(", ")}] no coincide con el SQL`);
        }
      }
      const indicesDrizzle = par.indices.map((indice) => indice.nombre).sort().join(",");
      const indicesMigracion = indicesSql
        .filter((item) => item.indice.tabla === tabla.nombre)
        .map((item) => item.indice.nombre)
        .sort()
        .join(",");
      if (indicesDrizzle !== indicesMigracion) {
        diferencias.push(`${tabla.nombre}: índices SQL [${indicesMigracion}] y Drizzle [${indicesDrizzle}]`);
      }
    }
    const unicos: TablaInventario["unicos"] = tabla.columnas
      .filter((columna) => columna.unico)
      .map((columna) => ({
        columnas: [columna.nombre],
        nombreEnSql: columna.nombreUnico,
        nombreGeneradoPorDrizzleOrm: par?.columnas.find((item) => item.nombre === columna.nombre)?.nombreUnico ?? null,
        nombreEnNeon: CONFIRMAR,
      }));
    for (const restriccion of tabla.restricciones.filter((item) => item.tipo === "unique" && item.columnas.length !== 1)) {
      unicos.push({
        columnas: restriccion.columnas,
        nombreEnSql: restriccion.nombre,
        nombreGeneradoPorDrizzleOrm: par?.unicosDeTabla.find((item) => mismoConjunto(item.columnas, restriccion.columnas))?.nombre ?? null,
        nombreEnNeon: CONFIRMAR,
      });
    }
    const indices = [
      ...indicesSql
        .filter((item) => item.indice.tabla === tabla.nombre)
        .map((item) => ({
          nombre: item.indice.nombre,
          unico: item.indice.unico,
          metodo: item.indice.metodo,
          columnas: item.indice.columnas,
          origen: "sql" as const,
          archivo: item.archivo,
        })),
      ...(par?.indices ?? []),
    ];
    const checks = [
      ...tabla.columnas.flatMap((columna) => columna.checks.map((expresion) => ({ nombre: null, expresion, origen: "sql" as const }))),
      ...tabla.restricciones
        .filter((restriccion) => restriccion.tipo === "check" && restriccion.expresion)
        .map((restriccion) => ({ nombre: restriccion.nombre, expresion: restriccion.expresion ?? "", origen: "sql" as const })),
      ...(par?.checks.map((check) => ({ nombre: check.nombre, expresion: check.expresion, origen: "drizzle" as const })) ?? []),
    ];
    return {
      nombre: tabla.nombre,
      esquemaPostgres: tabla.esquema,
      archivoMigracion: archivo,
      archivoOrm: par ? "lib/db/schema.ts" : null,
      exportDrizzle: par?.exportacion ?? null,
      ifNotExists: tabla.ifNotExists,
      rlsEnDrizzle: par?.rls ?? false,
      columnas,
      llavePrimaria: {
        columnas: pkColumnas,
        nombreEnSql: pkSql?.nombre ?? null,
        nombreEnNeon: CONFIRMAR,
        createIndexEnLaMigracion: indicesSql.some(
          (item) => item.indice.tabla === tabla.nombre && mismoConjunto(item.indice.columnas.map((columna) => columna.nombre), pkColumnas),
        ),
      },
      unicos,
      clavesForaneas: columnas.flatMap((columna) => (columna.claveForanea ? [columna.claveForanea] : [])),
      indices,
      checks,
    };
  });

  for (const tabla of drizzle.tablas) {
    if (!nombresTablas.has(tabla.nombre)) diferencias.push(`${tabla.nombre}: está en lib/db/schema.ts y no en las migraciones SQL`);
  }
  for (const indice of indicesSql) {
    if (!nombresTablas.has(indice.indice.tabla)) {
      diferencias.push(`El índice ${indice.indice.nombre} apunta a ${indice.indice.tabla}, que no aparece en un CREATE TABLE. ${CONFIRMAR}`);
    }
  }

  const columnasIdSinFk = tablas.flatMap((tabla) =>
    tabla.columnas
      .filter((columna) => columna.nombre.endsWith("_id") && !columna.esLlavePrimaria && !columna.claveForanea)
      .map((columna) => {
        const stem = columna.nombre.slice(0, -"_id".length);
        const destinos = candidatosId(stem, nombresTablas).filter((nombre) => nombre !== tabla.nombre);
        const nota =
          destinos.length > 0
            ? `Hay ${destinos.join(", ")} en el esquema y esta columna no tiene REFERENCES. ${CONFIRMAR}`
            : `Termina en _id y no tiene REFERENCES. Ninguna tabla del esquema coincide con ${stem}. ${CONFIRMAR}`;
        return { tabla: tabla.nombre, columna: columna.nombre, tablasDestinoEnElEsquema: destinos, nota };
      }),
  );

  const relaciones = tablas.flatMap((tabla) =>
    tabla.clavesForaneas.map((clave) => ({
      desde: { tabla: tabla.nombre, columnas: clave.columnas },
      hacia: { tabla: clave.tabla, columnas: clave.columnasReferenciadas },
      declaradaEnSql: true as const,
      declaradaEnDrizzle: clave.onDeleteEnDrizzle !== null || clave.nombreGeneradoPorDrizzleOrm !== null,
      onDeleteEnSql: clave.onDeleteEnSql,
      onUpdateEnSql: clave.onUpdateEnSql,
      nombreEnSql: clave.nombreEnSql,
      nombreEnNeon: CONFIRMAR,
    })),
  );

  const esquemasDistintos = new Set(tablas.map((tabla) => tabla.esquemaPostgres).concat(drizzle.tablas.map((tabla) => tabla.esquema)));
  const pendientes: string[] = [];
  if (!archivos.find((archivo) => archivo.ruta === "drizzle/meta/_journal.json")?.presente) {
    pendientes.push(`No está drizzle/meta/_journal.json. ${CONFIRMAR}`);
  }
  if ([...esquemasDistintos].every((esquemaPostgres) => esquemaPostgres === null)) {
    pendientes.push(`El SQL no califica las tablas y pgTable no recibe esquema. Si en Neon no están en public, ${CONFIRMAR}`);
  }
  const unicosSinNombre = tablas.flatMap((tabla) => tabla.unicos.filter((unico) => unico.nombreEnSql === null).map((unico) => `${tabla.nombre}(${unico.columnas.join(", ")})`));
  if (unicosSinNombre.length > 0) {
    pendientes.push(`UNIQUE sin nombre en el SQL: ${unicosSinNombre.join(", ")}. El nombre en Neon: ${CONFIRMAR}`);
  }
  if (tablas.some((tabla) => tabla.llavePrimaria.nombreEnSql === null)) {
    pendientes.push(`Las PRIMARY KEY no tienen nombre en el SQL. El nombre del índice en Neon: ${CONFIRMAR}`);
  }
  if (tablas.every((tabla) => tabla.indices.length === 0)) {
    pendientes.push(`No hay CREATE INDEX ni index() de Drizzle. PostgreSQL igual crea índice para cada PRIMARY KEY y cada UNIQUE; esos nombres no están en el código. ${CONFIRMAR}`);
  }
  if (relaciones.some((relacion) => relacion.nombreEnSql === null)) {
    pendientes.push(`Las REFERENCES no tienen nombre de restricción en el SQL. El nombre en Neon: ${CONFIRMAR}`);
  }
  for (const columna of columnasIdSinFk) pendientes.push(`${columna.tabla}.${columna.columna}: ${columna.nota}`);
  for (const sentencia of sentenciasNoParseadas) pendientes.push(`${sentencia.archivo}: ${sentencia.nota}`);
  for (const sql of sqls) {
    if (!leidosPorMigrar.includes(sql)) pendientes.push(`${sql} no lo lee scripts/migrar.ts. ${CONFIRMAR}`);
  }
  if (!config.schema || !config.out || !config.dialect) pendientes.push(`drizzle.config.ts no se pudo leer por completo. ${CONFIRMAR}`);

  const versiones: Inventario["motor"]["versiones"] = {};
  for (const nombre of ["drizzle-orm", "drizzle-kit", "@neondatabase/serverless"]) {
    versiones[nombre] = { rangoEnPackageJson: rangoDe(pkg, nombre), versionEnPackageLock: versionDe(lock, nombre) };
  }

  return {
    versionInventario: 1,
    generadoPor: "scripts/backend-traspaso/generar-esquema.ts",
    consultaANeon: false,
    motor: {
      baseDeDatos: "PostgreSQL",
      proveedorEnCodigo: "Neon, vía @neondatabase/serverless en scripts/migrar.ts y drizzle-orm/neon-http en lib/db/neon.ts",
      orm: "drizzle-orm",
      kit: "drizzle-kit",
      versiones,
      dialectoDrizzleKit: config.dialect,
      esquemaPostgres: null,
      notaEsquemaPostgres: `No está declarado. ${CONFIRMAR} si en Neon el search_path no deja las tablas en public.`,
    },
    archivos,
    tablas,
    relaciones,
    columnasIdSinFk,
    comparacionSqlYDrizzle: {
      coinciden: diferencias.length === 0,
      diferencias,
    },
    sentenciasNoParseadas,
    pendientesConEsteban: pendientes,
  };
}

const RUTAS_DE_ESQUEMA = [/^drizzle\//, /^lib\/db\/schema\.ts$/, /^drizzle\.config\.ts$/, /^scripts\/migrar\.ts$/, /\.sql$/];

const PATRONES_DDL: { nombre: string; expresion: RegExp }[] = [
  { nombre: "CREATE TABLE", expresion: /\bCREATE\s+TABLE\b/i },
  { nombre: "ALTER TABLE", expresion: /\bALTER\s+TABLE\b/i },
  { nombre: "DROP TABLE", expresion: /\bDROP\s+TABLE\b/i },
  { nombre: "CREATE INDEX", expresion: /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i },
  { nombre: "CREATE TYPE", expresion: /\bCREATE\s+TYPE\b/i },
  { nombre: "pgTable", expresion: /\bpgTable\s*\(/ },
  { nombre: ".references(", expresion: /\.references\s*\(/ },
  { nombre: "REFERENCES", expresion: /\bREFERENCES\s+[A-Za-z_"]/i },
];

export function esRutaDeEsquema(ruta: string): boolean {
  const normal = ruta.replaceAll("\\", "/");
  return RUTAS_DE_ESQUEMA.some((patron) => patron.test(normal));
}

export function analizarDiff(diff: string): { tocaEsquema: boolean; hallazgos: string[] } {
  const hallazgos: string[] = [];
  const bloques = diff.split(/^diff --git /m).slice(1);
  for (const bloque of bloques) {
    const primera = bloque.split("\n")[0] ?? "";
    const rutas = primera.match(/^a\/(.+?) b\/(.+)$/);
    const ruta = (rutas?.[2] ?? primera).trim();
    if (esRutaDeEsquema(ruta)) hallazgos.push(`${ruta}: archivo de esquema, migración o aplicador`);
    if (ruta.endsWith(".md")) continue;
    const lineas = bloque
      .split("\n")
      .filter((linea) => (linea.startsWith("+") || linea.startsWith("-")) && !linea.startsWith("+++") && !linea.startsWith("---"));
    const texto = lineas.join("\n");
    for (const patron of PATRONES_DDL) {
      if (patron.expresion.test(texto)) hallazgos.push(`${ruta}: aparece ${patron.nombre}`);
    }
  }
  return { tocaEsquema: hallazgos.length > 0, hallazgos };
}
