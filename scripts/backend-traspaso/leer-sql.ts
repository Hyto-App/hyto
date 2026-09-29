import { sentencias } from "../../lib/db/sql";

export type Token =
  | { tipo: "id"; valor: string }
  | { tipo: "cadena"; valor: string }
  | { tipo: "numero"; valor: string }
  | { tipo: "simbolo"; valor: string };

export type DefaultSql = {
  declarado: boolean;
  texto: string | null;
  esNull: boolean;
};

export type ClaveForaneaSql = {
  columnas: string[];
  tabla: string;
  esquema: string | null;
  columnasReferenciadas: string[];
  onDelete: string | null;
  onUpdate: string | null;
  nombre: string | null;
};

export type ColumnaSql = {
  nombre: string;
  tipo: string;
  notNullExplicito: boolean;
  pk: boolean;
  unico: boolean;
  nombreUnico: string | null;
  default: DefaultSql;
  claveForanea: ClaveForaneaSql | null;
  checks: string[];
};

export type RestriccionTablaSql = {
  tipo: "primary key" | "unique" | "foreign key" | "check";
  nombre: string | null;
  columnas: string[];
  claveForanea: ClaveForaneaSql | null;
  expresion: string | null;
};

export type TablaSql = {
  nombre: string;
  esquema: string | null;
  ifNotExists: boolean;
  columnas: ColumnaSql[];
  restricciones: RestriccionTablaSql[];
  sql: string;
};

export type IndiceSql = {
  nombre: string;
  tabla: string;
  esquemaTabla: string | null;
  unico: boolean;
  ifNotExists: boolean;
  metodo: string | null;
  columnas: { nombre: string; orden: "asc" | "desc" | null }[];
  sql: string;
};

export type AlterColumnaSql = {
  tabla: string;
  esquema: string | null;
  ifNotExists: boolean;
  columna: ColumnaSql;
};

export type SentenciaSql =
  | { tipo: "tabla"; parseada: true; tabla: TablaSql; sql: string }
  | { tipo: "indice"; parseada: true; indice: IndiceSql; sql: string }
  | { tipo: "alter-columna"; parseada: true; alteracion: AlterColumnaSql; sql: string }
  | { tipo: "no-parseada"; parseada: false; sql: string; nota: string };

const CONFIRMAR = "confirmar con Esteban";

class Cursor {
  private i = 0;

  constructor(private readonly tokens: Token[]) {}

  fin(): boolean {
    return this.i >= this.tokens.length;
  }

  ver(): Token {
    const token = this.tokens[this.i];
    if (!token) throw new Error("se acabaron los tokens");
    return token;
  }

  tomar(): Token {
    const token = this.ver();
    this.i += 1;
    return token;
  }

  verId(esperado?: string): boolean {
    if (this.fin()) return false;
    const token = this.tokens[this.i];
    if (token?.tipo !== "id") return false;
    if (esperado === undefined) return true;
    return token.valor.toLowerCase() === esperado.toLowerCase();
  }

  verSimbolo(simbolo: string): boolean {
    if (this.fin()) return false;
    const token = this.tokens[this.i];
    return token?.tipo === "simbolo" && token.valor === simbolo;
  }

  esperarId(esperado?: string): string {
    if (!this.verId(esperado)) {
      const visto = this.fin() ? "fin" : describir(this.ver());
      throw new Error(esperado ? `se esperaba ${esperado} y llegó ${visto}` : `se esperaba un identificador y llegó ${visto}`);
    }
    return this.tomar().valor;
  }

  esperarSimbolo(simbolo: string): void {
    if (!this.verSimbolo(simbolo)) {
      const visto = this.fin() ? "fin" : describir(this.ver());
      throw new Error(`se esperaba ${simbolo} y llegó ${visto}`);
    }
    this.tomar();
  }

  leerGrupo(): string {
    this.esperarSimbolo("(");
    let profundidad = 1;
    let texto = "(";
    while (!this.fin()) {
      const token = this.tomar();
      if (token.tipo === "simbolo" && token.valor === "(") profundidad += 1;
      if (token.tipo === "simbolo" && token.valor === ")") profundidad -= 1;
      texto += textoToken(token);
      if (profundidad === 0) return texto;
    }
    throw new Error("paréntesis sin cerrar");
  }
}

function describir(token: Token): string {
  if (token.tipo === "cadena") return `'${token.valor}'`;
  return token.valor;
}

function textoToken(token: Token): string {
  if (token.tipo === "cadena") return `'${token.valor.replaceAll("'", "''")}'`;
  return token.valor;
}

export function tokenizar(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    const caracter = sql[i] ?? "";
    if (caracter === " " || caracter === "\n" || caracter === "\t" || caracter === "\r") {
      i += 1;
      continue;
    }
    if (caracter === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      continue;
    }
    if (caracter === "'") {
      let valor = "";
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          valor += "'";
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i += 1;
          break;
        }
        valor += sql[i];
        i += 1;
      }
      tokens.push({ tipo: "cadena", valor });
      continue;
    }
    if (caracter === '"') {
      let valor = "";
      i += 1;
      while (i < sql.length && sql[i] !== '"') {
        valor += sql[i];
        i += 1;
      }
      if (sql[i] !== '"') throw new Error("identificador entre comillas sin cerrar");
      i += 1;
      tokens.push({ tipo: "id", valor });
      continue;
    }
    if (/[0-9]/.test(caracter)) {
      let valor = "";
      while (i < sql.length && /[0-9.]/.test(sql[i] ?? "")) {
        valor += sql[i];
        i += 1;
      }
      tokens.push({ tipo: "numero", valor });
      continue;
    }
    if (/[A-Za-z_]/.test(caracter)) {
      let valor = "";
      while (i < sql.length && /[A-Za-z0-9_]/.test(sql[i] ?? "")) {
        valor += sql[i];
        i += 1;
      }
      tokens.push({ tipo: "id", valor });
      continue;
    }
    tokens.push({ tipo: "simbolo", valor: caracter });
    i += 1;
  }
  return tokens;
}

const FRENO_TIPO = new Set([
  "primary",
  "not",
  "null",
  "unique",
  "default",
  "references",
  "check",
  "collate",
  "constraint",
  "generated",
]);

function parsearTipo(cursor: Cursor): string {
  const partes: string[] = [];
  while (!cursor.fin()) {
    if (cursor.verSimbolo("(")) {
      partes.push(cursor.leerGrupo());
      continue;
    }
    if (cursor.verId() && !FRENO_TIPO.has(cursor.ver().valor.toLowerCase())) {
      partes.push(cursor.tomar().valor);
      continue;
    }
    break;
  }
  if (partes.length === 0) throw new Error("falta el tipo de la columna");
  return partes.join(" ").replaceAll(" (", "(");
}

function leerDefault(cursor: Cursor): DefaultSql {
  if (cursor.fin()) throw new Error("falta el valor de DEFAULT");
  const token = cursor.ver();
  if (token.tipo === "cadena") {
    cursor.tomar();
    return { declarado: true, texto: token.valor, esNull: false };
  }
  if (token.tipo === "numero") {
    cursor.tomar();
    return { declarado: true, texto: token.valor, esNull: false };
  }
  if (token.tipo === "simbolo" && (token.valor === "-" || token.valor === "+")) {
    const signo = cursor.tomar().valor;
    if (cursor.fin() || cursor.ver().tipo !== "numero") throw new Error("DEFAULT numérico incompleto");
    return { declarado: true, texto: signo + cursor.tomar().valor, esNull: false };
  }
  if (cursor.verId("null")) {
    cursor.tomar();
    return { declarado: true, texto: null, esNull: true };
  }
  if (cursor.verId("true") || cursor.verId("false")) {
    return { declarado: true, texto: cursor.tomar().valor.toLowerCase(), esNull: false };
  }
  if (cursor.verSimbolo("(")) {
    return { declarado: true, texto: cursor.leerGrupo(), esNull: false };
  }
  if (cursor.verId()) {
    let texto = cursor.tomar().valor;
    if (cursor.verSimbolo("(")) texto += cursor.leerGrupo();
    return { declarado: true, texto, esNull: false };
  }
  throw new Error("DEFAULT no reconocido");
}

function leerAccion(cursor: Cursor): string {
  const primera = cursor.esperarId().toLowerCase();
  if (primera === "no") {
    const segunda = cursor.esperarId().toLowerCase();
    if (segunda !== "action") throw new Error("ON DELETE/UPDATE no action incompleto");
    return "no action";
  }
  if (primera === "set") {
    const segunda = cursor.esperarId().toLowerCase();
    if (segunda !== "null" && segunda !== "default") throw new Error("ON DELETE/UPDATE set incompleto");
    return `set ${segunda}`;
  }
  if (primera === "cascade" || primera === "restrict") return primera;
  throw new Error(`acción ${primera} no reconocida`);
}

function nombreCalificado(cursor: Cursor): { esquema: string | null; nombre: string } {
  const primero = cursor.esperarId();
  if (!cursor.verSimbolo(".")) return { esquema: null, nombre: primero };
  cursor.tomar();
  return { esquema: primero, nombre: cursor.esperarId() };
}

function leerListaSimple(cursor: Cursor): string[] {
  cursor.esperarSimbolo("(");
  const columnas: string[] = [];
  if (cursor.verSimbolo(")")) throw new Error("lista de columnas vacía");
  while (!cursor.fin()) {
    if (!cursor.verId()) throw new Error("la lista no es solo nombres de columna");
    columnas.push(cursor.tomar().valor);
    if (cursor.verSimbolo(")")) {
      cursor.tomar();
      return columnas;
    }
    cursor.esperarSimbolo(",");
  }
  throw new Error("lista de columnas sin cerrar");
}

function leerReferencia(cursor: Cursor, columnas: string[], nombre: string | null): ClaveForaneaSql {
  cursor.esperarId("references");
  const destino = nombreCalificado(cursor);
  let columnasReferenciadas: string[] = [];
  if (cursor.verSimbolo("(")) columnasReferenciadas = leerListaSimple(cursor);
  let onDelete: string | null = null;
  let onUpdate: string | null = null;
  while (cursor.verId("on")) {
    cursor.tomar();
    if (cursor.verId("delete")) {
      cursor.tomar();
      onDelete = leerAccion(cursor);
      continue;
    }
    if (cursor.verId("update")) {
      cursor.tomar();
      onUpdate = leerAccion(cursor);
      continue;
    }
    throw new Error("ON sin DELETE ni UPDATE");
  }
  return {
    columnas,
    tabla: destino.nombre,
    esquema: destino.esquema,
    columnasReferenciadas,
    onDelete,
    onUpdate,
    nombre,
  };
}

function defaultVacio(): DefaultSql {
  return { declarado: false, texto: null, esNull: false };
}

function parsearColumna(tokens: Token[]): ColumnaSql {
  const cursor = new Cursor(tokens);
  const nombre = cursor.esperarId();
  const tipo = parsearTipo(cursor);
  const columna: ColumnaSql = {
    nombre,
    tipo,
    notNullExplicito: false,
    pk: false,
    unico: false,
    nombreUnico: null,
    default: defaultVacio(),
    claveForanea: null,
    checks: [],
  };
  let nombreRestriccion: string | null = null;
  while (!cursor.fin()) {
    if (cursor.verId("constraint")) {
      cursor.tomar();
      nombreRestriccion = cursor.esperarId();
      continue;
    }
    if (cursor.verId("primary")) {
      cursor.tomar();
      cursor.esperarId("key");
      columna.pk = true;
      nombreRestriccion = null;
      continue;
    }
    if (cursor.verId("not")) {
      cursor.tomar();
      cursor.esperarId("null");
      columna.notNullExplicito = true;
      nombreRestriccion = null;
      continue;
    }
    if (cursor.verId("null")) {
      cursor.tomar();
      nombreRestriccion = null;
      continue;
    }
    if (cursor.verId("unique")) {
      cursor.tomar();
      columna.unico = true;
      columna.nombreUnico = nombreRestriccion;
      nombreRestriccion = null;
      continue;
    }
    if (cursor.verId("default")) {
      cursor.tomar();
      columna.default = leerDefault(cursor);
      nombreRestriccion = null;
      continue;
    }
    if (cursor.verId("references")) {
      columna.claveForanea = leerReferencia(cursor, [nombre], nombreRestriccion);
      nombreRestriccion = null;
      continue;
    }
    if (cursor.verId("check")) {
      cursor.tomar();
      columna.checks.push(cursor.leerGrupo());
      nombreRestriccion = null;
      continue;
    }
    if (cursor.verId("collate")) {
      cursor.tomar();
      cursor.esperarId();
      nombreRestriccion = null;
      continue;
    }
    if (cursor.verId("generated")) {
      throw new Error("columna GENERATED");
    }
    throw new Error(`restricción de columna no reconocida: ${cursor.ver().tipo === "id" ? cursor.ver().valor : describir(cursor.ver())}`);
  }
  return columna;
}

function parsearRestriccionTabla(tokens: Token[], nombreInicial: string | null): RestriccionTablaSql {
  const cursor = new Cursor(tokens);
  let nombre = nombreInicial;
  if (nombre === null && cursor.verId("constraint")) {
    cursor.tomar();
    nombre = cursor.esperarId();
  }
  if (cursor.verId("primary")) {
    cursor.tomar();
    cursor.esperarId("key");
    const columnas = leerListaSimple(cursor);
    if (!cursor.fin()) throw new Error("sobra texto en PRIMARY KEY");
    return { tipo: "primary key", nombre, columnas, claveForanea: null, expresion: null };
  }
  if (cursor.verId("unique")) {
    cursor.tomar();
    const columnas = leerListaSimple(cursor);
    if (!cursor.fin()) throw new Error("sobra texto en UNIQUE");
    return { tipo: "unique", nombre, columnas, claveForanea: null, expresion: null };
  }
  if (cursor.verId("foreign")) {
    cursor.tomar();
    cursor.esperarId("key");
    const columnas = leerListaSimple(cursor);
    const claveForanea = leerReferencia(cursor, columnas, nombre);
    if (!cursor.fin()) throw new Error("sobra texto en FOREIGN KEY");
    return { tipo: "foreign key", nombre, columnas, claveForanea, expresion: null };
  }
  if (cursor.verId("check")) {
    cursor.tomar();
    const expresion = cursor.leerGrupo();
    if (!cursor.fin()) throw new Error("sobra texto en CHECK");
    return { tipo: "check", nombre, columnas: [], claveForanea: null, expresion };
  }
  throw new Error("restricción de tabla no reconocida");
}

function esRestriccionDeTabla(tokens: Token[]): boolean {
  const primero = tokens[0];
  if (!primero || primero.tipo !== "id") return false;
  const palabra = primero.valor.toLowerCase();
  if (palabra === "primary" || palabra === "unique" || palabra === "foreign" || palabra === "check" || palabra === "exclude") {
    return true;
  }
  if (palabra !== "constraint") return false;
  const tercera = tokens[2];
  if (!tercera || tercera.tipo !== "id") return false;
  const sigue = tercera.valor.toLowerCase();
  return sigue === "primary" || sigue === "unique" || sigue === "foreign" || sigue === "check" || sigue === "exclude";
}

function partirDefs(tokens: Token[]): Token[][] {
  const partes: Token[][] = [];
  let actual: Token[] = [];
  let profundidad = 0;
  for (const token of tokens) {
    if (token.tipo === "simbolo" && token.valor === "(") profundidad += 1;
    if (token.tipo === "simbolo" && token.valor === ")") profundidad -= 1;
    if (token.tipo === "simbolo" && token.valor === "," && profundidad === 0) {
      if (actual.length === 0) throw new Error("definición vacía");
      partes.push(actual);
      actual = [];
      continue;
    }
    actual.push(token);
  }
  if (actual.length > 0) partes.push(actual);
  return partes;
}

function aplicarRestriccion(tabla: TablaSql, restriccion: RestriccionTablaSql): void {
  tabla.restricciones.push(restriccion);
  if (restriccion.tipo === "primary key") {
    for (const nombre of restriccion.columnas) {
      const columna = tabla.columnas.find((item) => item.nombre === nombre);
      if (!columna) throw new Error(`PRIMARY KEY cita ${nombre}, que no es columna`);
      columna.pk = true;
    }
  }
  if (restriccion.tipo === "unique" && restriccion.columnas.length === 1) {
    const columna = tabla.columnas.find((item) => item.nombre === restriccion.columnas[0]);
    if (!columna) throw new Error(`UNIQUE cita una columna que no existe`);
    columna.unico = true;
    columna.nombreUnico = restriccion.nombre;
  }
  if (restriccion.tipo === "foreign key" && restriccion.claveForanea && restriccion.columnas.length === 1) {
    const columna = tabla.columnas.find((item) => item.nombre === restriccion.columnas[0]);
    if (!columna) throw new Error(`FOREIGN KEY cita una columna que no existe`);
    columna.claveForanea = restriccion.claveForanea;
  }
}

function parsearCreateTable(cursor: Cursor, sql: string): SentenciaSql {
  let ifNotExists = false;
  if (cursor.verId("if")) {
    cursor.tomar();
    cursor.esperarId("not");
    cursor.esperarId("exists");
    ifNotExists = true;
  }
  const identidad = nombreCalificado(cursor);
  cursor.esperarSimbolo("(");
  const cuerpo: Token[] = [];
  let profundidad = 1;
  while (!cursor.fin()) {
    const token = cursor.tomar();
    if (token.tipo === "simbolo" && token.valor === "(") profundidad += 1;
    if (token.tipo === "simbolo" && token.valor === ")") {
      profundidad -= 1;
      if (profundidad === 0) break;
    }
    cuerpo.push(token);
  }
  if (profundidad !== 0) throw new Error("CREATE TABLE sin cerrar");
  if (!cursor.fin()) throw new Error("sobra texto después de CREATE TABLE");
  const tabla: TablaSql = {
    nombre: identidad.nombre,
    esquema: identidad.esquema,
    ifNotExists,
    columnas: [],
    restricciones: [],
    sql: sql.trim(),
  };
  for (const definicion of partirDefs(cuerpo)) {
    if (esRestriccionDeTabla(definicion)) {
      aplicarRestriccion(tabla, parsearRestriccionTabla(definicion, null));
    } else {
      tabla.columnas.push(parsearColumna(definicion));
    }
  }
  if (tabla.columnas.length === 0) throw new Error("CREATE TABLE sin columnas");
  return { tipo: "tabla", parseada: true, tabla, sql: sql.trim() };
}

function leerColumnasDeIndice(cursor: Cursor): { nombre: string; orden: "asc" | "desc" | null }[] {
  cursor.esperarSimbolo("(");
  const columnas: { nombre: string; orden: "asc" | "desc" | null }[] = [];
  if (cursor.verSimbolo(")")) throw new Error("índice sin columnas");
  while (!cursor.fin()) {
    if (!cursor.verId()) throw new Error("columna de índice que no es un nombre");
    const nombre = cursor.tomar().valor;
    let orden: "asc" | "desc" | null = null;
    if (cursor.verId("asc") || cursor.verId("desc")) {
      orden = cursor.tomar().valor.toLowerCase() === "desc" ? "desc" : "asc";
    }
    columnas.push({ nombre, orden });
    if (cursor.verSimbolo(")")) {
      cursor.tomar();
      return columnas;
    }
    cursor.esperarSimbolo(",");
  }
  throw new Error("índice sin cerrar");
}

function parsearCreateIndex(cursor: Cursor, sql: string, unico: boolean): SentenciaSql {
  if (cursor.verId("concurrently")) throw new Error("CREATE INDEX CONCURRENTLY");
  let ifNotExists = false;
  if (cursor.verId("if")) {
    cursor.tomar();
    cursor.esperarId("not");
    cursor.esperarId("exists");
    ifNotExists = true;
  }
  const nombre = cursor.esperarId();
  cursor.esperarId("on");
  if (cursor.verId("only")) cursor.tomar();
  const tabla = nombreCalificado(cursor);
  let metodo: string | null = null;
  if (cursor.verId("using")) {
    cursor.tomar();
    metodo = cursor.esperarId();
  }
  const columnas = leerColumnasDeIndice(cursor);
  if (!cursor.fin()) throw new Error("sobra texto en CREATE INDEX");
  return {
    tipo: "indice",
    parseada: true,
    sql: sql.trim(),
    indice: {
      nombre,
      tabla: tabla.nombre,
      esquemaTabla: tabla.esquema,
      unico,
      ifNotExists,
      metodo,
      columnas,
      sql: sql.trim(),
    },
  };
}

function parsearAlterColumna(cursor: Cursor, sql: string): SentenciaSql {
  if (cursor.verId("only")) cursor.tomar();
  const identidad = nombreCalificado(cursor);
  cursor.esperarId("add");
  cursor.esperarId("column");
  if (!cursor.verId("if")) throw new Error("ADD COLUMN sin IF NOT EXISTS");
  cursor.tomar();
  cursor.esperarId("not");
  cursor.esperarId("exists");
  const ifNotExists = true;
  const restantes: Token[] = [];
  while (!cursor.fin()) restantes.push(cursor.tomar());
  if (restantes.length === 0) throw new Error("ADD COLUMN sin definición");
  return {
    tipo: "alter-columna",
    parseada: true,
    sql: sql.trim(),
    alteracion: {
      tabla: identidad.nombre,
      esquema: identidad.esquema,
      ifNotExists,
      columna: parsearColumna(restantes),
    },
  };
}

export function parsearSentencia(sql: string): SentenciaSql {
  try {
    const cursor = new Cursor(tokenizar(sql));
    if (cursor.fin()) throw new Error("sentencia vacía");
    if (cursor.verId("alter")) {
      cursor.tomar();
      cursor.esperarId("table");
      return parsearAlterColumna(cursor, sql);
    }
    if (!cursor.verId("create")) {
      throw new Error(`sentencia ${cursor.ver().tipo === "id" ? cursor.ver().valor : "no reconocida"}`);
    }
    cursor.tomar();
    let unico = false;
    if (cursor.verId("unique")) {
      cursor.tomar();
      unico = true;
    }
    if (cursor.verId("table")) {
      if (unico) throw new Error("CREATE UNIQUE TABLE");
      cursor.tomar();
      return parsearCreateTable(cursor, sql);
    }
    if (cursor.verId("index")) {
      cursor.tomar();
      return parsearCreateIndex(cursor, sql, unico);
    }
    const palabra = cursor.fin() ? "" : cursor.ver().tipo === "id" ? cursor.ver().valor : "";
    throw new Error(`CREATE ${palabra}`.trim());
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "no se pudo leer";
    const nota = mensaje.includes(CONFIRMAR) ? mensaje : `${mensaje}. ${CONFIRMAR}`;
    return { tipo: "no-parseada", parseada: false, sql: sql.trim(), nota };
  }
}

export function parsearSql(sql: string): SentenciaSql[] {
  return sentencias(sql).map((sentencia) => parsearSentencia(sentencia));
}
