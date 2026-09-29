import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sentencias } from "./sql";

export type ColumnaEsperada = {
  tabla: string;
  nombre: string;
  tipo: string;
  nullable: boolean;
  defecto: string | null;
  primaryKey: boolean;
  unique: boolean;
  referencia: { tabla: string; columna: string } | null;
  alBorrar: string;
  alBorrarExplicito: boolean;
};

export type GrupoColumnas = {
  tabla: string;
  columnas: string[];
};

export type FkEsperada = {
  tabla: string;
  columnas: string[];
  tablaRef: string;
  columnasRef: string[];
  alBorrar: string;
  alBorrarExplicito: boolean;
};

export type IndiceEsperado = {
  nombre: string;
  tabla: string;
};

export type EsquemaEsperado = {
  archivos: string[];
  tablas: string[];
  columnas: ColumnaEsperada[];
  primaryKeys: GrupoColumnas[];
  uniques: GrupoColumnas[];
  fks: FkEsperada[];
  indices: IndiceEsperado[];
  avisos: string[];
};

export function leerMigraciones(directorio: string): EsquemaEsperado {
  const esquema = vacio();
  let nombres: string[];
  try {
    nombres = readdirSync(directorio)
      .filter((nombre) => nombre.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    esquema.avisos.push(`No se pudo leer ${directorio}. Confirmar con Esteban.`);
    return esquema;
  }
  if (nombres.length === 0) {
    esquema.avisos.push(`No hay archivos .sql en ${directorio}. Confirmar con Esteban.`);
    return esquema;
  }
  for (const nombre of nombres) {
    esquema.archivos.push(nombre);
    const crudo = readFileSync(join(directorio, nombre), "utf8");
    const sql = crudo.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/-->\s*statement-breakpoint/gi, " ");
    for (const sentencia of sentencias(sql)) aplicar(esquema, sentencia, nombre);
  }
  cerrarGrupos(esquema);
  return esquema;
}

export function normalizarTipo(tipo: string): string {
  const limpio = tipo
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+\(/g, "(")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
  if (limpio === "int" || limpio === "int4" || limpio === "integer" || limpio === "serial") return "integer";
  if (limpio === "smallserial") return "smallint";
  if (limpio === "int8" || limpio === "bigint" || limpio === "bigserial") return "bigint";
  if (limpio === "bool" || limpio === "boolean") return "boolean";
  if (/^timestamp(?:\(\d+\))?(?: without time zone)?$/.test(limpio)) return "timestamp without time zone";
  if (/^timestamp(?:\(\d+\))? with time zone$/.test(limpio) || /^timestamptz(?:\(\d+\))?$/.test(limpio)) {
    return "timestamp with time zone";
  }
  if (limpio === "varchar") return "character varying";
  if (limpio.startsWith("varchar(")) return `character varying${limpio.slice("varchar".length)}`;
  if (limpio === "char") return "character";
  if (limpio.startsWith("char(")) return `character${limpio.slice("char".length)}`;
  const numerico = /^(?:numeric|decimal)\((\d+)(?:,(\d+))?\)$/.exec(limpio);
  if (numerico) return `numeric(${numerico[1]},${numerico[2] ?? "0"})`;
  return limpio;
}

export function normalizarDefault(valor: string | null | undefined): string | null {
  if (valor == null) return null;
  let actual = valor.trim();
  if (!actual || /^null$/i.test(actual)) return null;
  let cambio = true;
  while (cambio) {
    cambio = false;
    const parentesis = actual.match(/^\((.*)\)$/);
    if (parentesis) {
      actual = parentesis[1].trim();
      cambio = true;
    }
    const sinCast = actual.replace(
      /::(?:character varying|timestamp with time zone|double precision|"[^"]+"|[A-Za-z_][\w]*)(?:\s*\([^)]*\))?$/i,
      "",
    ).trim();
    if (sinCast !== actual) {
      actual = sinCast;
      cambio = true;
    }
  }
  if (/^null$/i.test(actual)) return null;
  return actual;
}

function vacio(): EsquemaEsperado {
  return { archivos: [], tablas: [], columnas: [], primaryKeys: [], uniques: [], fks: [], indices: [], avisos: [] };
}

function aplicar(esquema: EsquemaEsperado, sentencia: string, archivo: string): void {
  const crear = /^create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(?:"?[A-Za-z_][\w]*"?)\s*\.\s*)?("?)([A-Za-z_][\w]*)\1\s*\(([\s\S]*)\)\s*$/i.exec(
    sentencia,
  );
  if (crear) {
    crearTabla(esquema, crear[2], crear[3]);
    return;
  }
  const indice = /^create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?("?)([A-Za-z_][\w]*)\1\s+on\s+(?:(?:"?[A-Za-z_][\w]*"?)\s*\.\s*)?("?)([A-Za-z_][\w]*)\3\b/i.exec(
    sentencia,
  );
  if (indice) {
    esquema.indices.push({ nombre: indice[2], tabla: indice[4] });
    return;
  }
  const alter = /^alter\s+table\s+(?:only\s+)?(?:(?:"?[A-Za-z_][\w]*"?)\s*\.\s*)?("?)([A-Za-z_][\w]*)\1\s+([\s\S]+)$/i.exec(
    sentencia,
  );
  if (alter) {
    const tabla = alter[2];
    const cuerpo = alter[3].trim();
    const agregar = /^add\s+column\s+(?:if\s+not\s+exists\s+)?([\s\S]+)$/i.exec(cuerpo);
    if (agregar) {
      asegurarTabla(esquema, tabla);
      const columna = parsearColumna(tabla, agregar[1].trim(), esquema.avisos);
      if (columna) guardarColumna(esquema, columna);
      return;
    }
    const fk = /^add\s+constraint\s+"?[A-Za-z_][\w]*"?\s+foreign\s+key\s*\(([^)]+)\)\s+([\s\S]+)$/i.exec(cuerpo);
    if (fk) {
      asegurarTabla(esquema, tabla);
      guardarFk(esquema, tabla, fk[1], fk[2]);
      return;
    }
  }
  const muestra = sentencia.replace(/\s+/g, " ").slice(0, 120);
  esquema.avisos.push(`SQL sin interpretar en ${archivo}: ${muestra}. Confirmar con Esteban.`);
}

function crearTabla(esquema: EsquemaEsperado, tabla: string, cuerpo: string): void {
  if (esquema.tablas.includes(tabla)) {
    esquema.avisos.push(`La tabla ${tabla} se declara más de una vez. Confirmar con Esteban.`);
  }
  asegurarTabla(esquema, tabla);
  for (const parte of partirComas(cuerpo)) {
    if (/^(constraint\s+\S+\s+)?(primary\s+key|unique|foreign\s+key|check)\b/i.test(parte)) {
      parsearRestriccion(esquema, tabla, parte);
      continue;
    }
    const columna = parsearColumna(tabla, parte, esquema.avisos);
    if (columna) guardarColumna(esquema, columna);
  }
}

function asegurarTabla(esquema: EsquemaEsperado, tabla: string): string {
  if (!esquema.tablas.includes(tabla)) esquema.tablas.push(tabla);
  return tabla;
}

function guardarColumna(esquema: EsquemaEsperado, columna: ColumnaEsperada): void {
  const previa = esquema.columnas.find((actual) => actual.tabla === columna.tabla && actual.nombre === columna.nombre);
  if (previa) {
    esquema.avisos.push(`La columna ${columna.tabla}.${columna.nombre} está repetida. Confirmar con Esteban.`);
    return;
  }
  esquema.columnas.push(columna);
}

function parsearColumna(tabla: string, parte: string, avisos: string[]): ColumnaEsperada | null {
  const match = /^("?)([A-Za-z_][\w]*)\1\s+([\s\S]+)$/.exec(parte.trim());
  if (!match) {
    avisos.push(`No se pudo leer una columna de ${tabla}. Confirmar con Esteban.`);
    return null;
  }
  const nombre = match[2];
  const tipoLeido = leerTipo(match[3].trim());
  if (!tipoLeido) {
    avisos.push(`Tipo no reconocido en ${tabla}.${nombre}. Confirmar con Esteban.`);
    return null;
  }
  const columna: ColumnaEsperada = {
    tabla,
    nombre,
    tipo: normalizarTipo(tipoLeido.tipo),
    nullable: true,
    defecto: null,
    primaryKey: false,
    unique: false,
    referencia: null,
    alBorrar: "a",
    alBorrarExplicito: false,
  };
  let resto = tipoLeido.resto;
  while (resto.length > 0) {
    if (/^not\s+null\b/i.test(resto)) {
      columna.nullable = false;
      resto = resto.replace(/^not\s+null\b/i, "").trim();
      continue;
    }
    if (/^null\b/i.test(resto)) {
      resto = resto.replace(/^null\b/i, "").trim();
      continue;
    }
    if (/^primary\s+key\b/i.test(resto)) {
      columna.primaryKey = true;
      columna.nullable = false;
      resto = resto.replace(/^primary\s+key\b/i, "").trim();
      continue;
    }
    if (/^unique\b/i.test(resto)) {
      columna.unique = true;
      resto = resto.replace(/^unique\b/i, "").trim();
      continue;
    }
    if (/^default\b/i.test(resto)) {
      const leido = leerDefault(resto);
      if (!leido) {
        avisos.push(`Default no leído en ${tabla}.${nombre}. Confirmar con Esteban.`);
        break;
      }
      columna.defecto = leido.valor;
      resto = leido.resto;
      if (leido.aviso) {
        avisos.push(`Default no leído en ${tabla}.${nombre}. Confirmar con Esteban.`);
        break;
      }
      continue;
    }
    if (/^references\b/i.test(resto)) {
      const ref = leerDestino(resto);
      const remotos = ref ? nombresDe(ref.columnas) : [];
      if (!ref || remotos.length !== 1) {
        avisos.push(`REFERENCES ilegible en ${tabla}.${nombre}. Confirmar con Esteban.`);
        break;
      }
      columna.referencia = { tabla: ref.tabla, columna: remotos[0] };
      resto = ref.resto;
      continue;
    }
    const accion = /^(on\s+delete|on\s+update)\s+(cascade|restrict|no\s+action|set\s+null|set\s+default)\b/i.exec(resto);
    if (accion) {
      if (/^on\s+delete\b/i.test(accion[1])) {
        columna.alBorrar = codigoAccion(accion[2]);
        columna.alBorrarExplicito = true;
      }
      resto = resto.slice(accion[0].length).trim();
      continue;
    }
    if (/^constraint\b/i.test(resto)) {
      resto = resto.replace(/^constraint\s+"?[A-Za-z_][\w]*"?/i, "").trim();
      continue;
    }
    avisos.push(`Sobra texto en ${tabla}.${nombre}. Confirmar con Esteban.`);
    break;
  }
  return columna;
}

function parsearRestriccion(esquema: EsquemaEsperado, tabla: string, parte: string): void {
  const limpio = parte.replace(/^constraint\s+"?[A-Za-z_][\w]*"?\s+/i, "").trim();
  const pk = /^primary\s+key\s*\(([^)]+)\)/i.exec(limpio);
  if (pk) {
    const columnas = nombresDe(pk[1]);
    for (const nombre of columnas) marcar(esquema, tabla, nombre, (columna) => {
      columna.primaryKey = true;
      columna.nullable = false;
    });
    if (!esquema.primaryKeys.some((grupo) => grupo.tabla === tabla)) {
      esquema.primaryKeys.push({ tabla, columnas });
    }
    return;
  }
  const unico = /^unique\s*\(([^)]+)\)/i.exec(limpio);
  if (unico) {
    const nombres = nombresDe(unico[1]);
    if (nombres.length === 1) {
      marcar(esquema, tabla, nombres[0], (columna) => {
        columna.unique = true;
      });
      return;
    }
    esquema.uniques.push({ tabla, columnas: nombres });
    return;
  }
  const fk = /^foreign\s+key\s*\(([^)]+)\)\s+([\s\S]+)$/i.exec(limpio);
  if (fk) {
    guardarFk(esquema, tabla, fk[1], fk[2]);
    return;
  }
  if (/^check\b/i.test(limpio)) {
    esquema.avisos.push(`Hay un CHECK en ${tabla} que este script no compara. Confirmar con Esteban.`);
    return;
  }
  esquema.avisos.push(`Restricción no leída en ${tabla}. Confirmar con Esteban.`);
}

function marcar(esquema: EsquemaEsperado, tabla: string, nombre: string, cambio: (columna: ColumnaEsperada) => void): void {
  const columna = esquema.columnas.find((actual) => actual.tabla === tabla && actual.nombre === nombre);
  if (!columna) {
    esquema.avisos.push(`La restricción de ${tabla} nombra ${nombre}, que no está en la tabla. Confirmar con Esteban.`);
    return;
  }
  cambio(columna);
}

function guardarFk(esquema: EsquemaEsperado, tabla: string, localesTexto: string, resto: string): void {
  const ref = leerDestino(resto.trim());
  if (!ref) {
    esquema.avisos.push(`REFERENCES ilegible en ${tabla}. Confirmar con Esteban.`);
    return;
  }
  const locales = nombresDe(localesTexto);
  const remotos = nombresDe(ref.columnas);
  if (locales.length !== remotos.length || locales.length !== 1) {
    esquema.avisos.push(`FK compuesta en ${tabla}. Confirmar con Esteban.`);
    return;
  }
  const accion = /\bon\s+delete\s+(cascade|restrict|no\s+action|set\s+null|set\s+default)\b/i.exec(ref.resto);
  marcar(esquema, tabla, locales[0], (columna) => {
    columna.referencia = { tabla: ref.tabla, columna: remotos[0] };
    if (accion) {
      columna.alBorrar = codigoAccion(accion[1]);
      columna.alBorrarExplicito = true;
    }
  });
}

function leerDestino(texto: string): { tabla: string; columnas: string; resto: string } | null {
  const match = /^references\s+(?:(?:"?[A-Za-z_][\w]*"?)\s*\.\s*)?("?)([A-Za-z_][\w]*)\1\s*\(([^)]+)\)/i.exec(texto);
  if (!match) return null;
  return { tabla: match[2], columnas: match[3], resto: texto.slice(match[0].length).trim() };
}

function cerrarGrupos(esquema: EsquemaEsperado): void {
  const pkYa = new Set(esquema.primaryKeys.map((grupo) => grupo.tabla));
  const pk = new Map<string, string[]>();
  const unicos = new Map<string, string[]>();
  for (const columna of esquema.columnas) {
    if (columna.primaryKey && !pkYa.has(columna.tabla)) {
      const lista = pk.get(columna.tabla) ?? [];
      lista.push(columna.nombre);
      pk.set(columna.tabla, lista);
    }
    if (columna.unique) unicos.set(`${columna.tabla}:${columna.nombre}`, [columna.nombre]);
    if (columna.referencia) {
      esquema.fks.push({
        tabla: columna.tabla,
        columnas: [columna.nombre],
        tablaRef: columna.referencia.tabla,
        columnasRef: [columna.referencia.columna],
        alBorrar: columna.alBorrar,
        alBorrarExplicito: columna.alBorrarExplicito,
      });
    }
  }
  for (const [tabla, columnas] of pk) esquema.primaryKeys.push({ tabla, columnas });
  for (const [clave, columnas] of unicos) {
    const tabla = clave.slice(0, clave.indexOf(":"));
    if (!esquema.uniques.some((grupo) => grupo.tabla === tabla && mismoOrden(grupo.columnas, columnas))) {
      esquema.uniques.push({ tabla, columnas });
    }
  }
}

function mismoOrden(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((nombre, i) => nombre === b[i]);
}

function leerTipo(texto: string): { tipo: string; resto: string } | null {
  const patrones = [
    /^timestamp\b(?:\s*\(\s*\d+\s*\))?\s+with\s+time\s+zone\b/i,
    /^timestamp\b(?:\s*\(\s*\d+\s*\))?\s+without\s+time\s+zone\b/i,
    /^timestamptz\b(?:\s*\(\s*\d+\s*\))?/i,
    /^timestamp\b(?:\s*\(\s*\d+\s*\))?/i,
    /^time\b(?:\s*\(\s*\d+\s*\))?/i,
    /^double\s+precision\b/i,
    /^character\s+varying\b(?:\s*\(\s*\d+\s*\))?/i,
    /^character\b(?:\s*\(\s*\d+\s*\))?/i,
    /^(?:varchar|char|text|integer|int|bigint|smallint|boolean|bool|numeric|decimal|real|uuid|jsonb|json|bytea|date|smallserial|bigserial|serial)\b(?:\s*\([^)]*\))?/i,
  ];
  for (const patron of patrones) {
    const match = patron.exec(texto);
    if (match && match.index === 0) {
      return { tipo: match[0].replace(/\s+/g, " ").trim(), resto: texto.slice(match[0].length).trim() };
    }
  }
  return null;
}

function leerDefault(resto: string): { valor: string | null; resto: string; aviso: boolean } | null {
  const inicio = /^default\b/i.exec(resto);
  if (!inicio) return null;
  const cuerpo = resto.slice(inicio[0].length).trim();
  if (cuerpo.startsWith("'")) {
    let valor = "'";
    let i = 1;
    while (i < cuerpo.length) {
      if (cuerpo[i] === "'" && cuerpo[i + 1] === "'") {
        valor += "''";
        i += 2;
        continue;
      }
      valor += cuerpo[i];
      if (cuerpo[i] === "'") {
        i += 1;
        break;
      }
      i += 1;
    }
    return { valor, resto: quitarCast(cuerpo.slice(i).trim()), aviso: false };
  }
  const simple = /^(null|true|false|-?\d+(?:\.\d+)?)/i.exec(cuerpo);
  if (simple) {
    const token = simple[1];
    const valor = /^null$/i.test(token) ? null : token.toLowerCase();
    return { valor, resto: quitarCast(cuerpo.slice(simple[0].length).trim()), aviso: false };
  }
  const funcion = /^[A-Za-z_][\w]*\([^)]*\)/.exec(cuerpo);
  if (funcion) {
    return { valor: funcion[0].toLowerCase(), resto: quitarCast(cuerpo.slice(funcion[0].length).trim()), aviso: false };
  }
  return { valor: null, resto: cuerpo, aviso: true };
}

function quitarCast(resto: string): string {
  const marca = /^::\s*/.exec(resto);
  if (!marca) return resto;
  const despues = resto.slice(marca[0].length);
  const tipo = leerTipo(despues);
  if (tipo) return tipo.resto;
  const simple = /^(?:"[^"]+"|[A-Za-z_][\w]*)(?:\s*\([^)]*\))?/.exec(despues);
  if (!simple) return resto;
  return despues.slice(simple[0].length).trim();
}

function codigoAccion(accion: string): string {
  const limpia = accion.toLowerCase().replace(/\s+/g, " ");
  if (limpia === "cascade") return "c";
  if (limpia === "restrict") return "r";
  if (limpia === "set null") return "n";
  if (limpia === "set default") return "d";
  return "a";
}

function nombresDe(lista: string): string[] {
  return lista
    .split(",")
    .map((nombre) => nombre.trim().replace(/^"(.+)"$/, "$1"))
    .filter((nombre) => nombre.length > 0);
}

function partirComas(cuerpo: string): string[] {
  const partes: string[] = [];
  let actual = "";
  let profundidad = 0;
  let comilla: "'" | '"' | null = null;
  for (let i = 0; i < cuerpo.length; i += 1) {
    const caracter = cuerpo[i];
    if (comilla) {
      actual += caracter;
      if (caracter === comilla) {
        if (cuerpo[i + 1] === comilla) {
          actual += cuerpo[i + 1];
          i += 1;
          continue;
        }
        comilla = null;
      }
      continue;
    }
    if (caracter === "'" || caracter === '"') {
      comilla = caracter;
      actual += caracter;
      continue;
    }
    if (caracter === "(") profundidad += 1;
    if (caracter === ")") profundidad = Math.max(0, profundidad - 1);
    if (caracter === "," && profundidad === 0) {
      if (actual.trim()) partes.push(actual.trim());
      actual = "";
      continue;
    }
    actual += caracter;
  }
  if (actual.trim()) partes.push(actual.trim());
  return partes;
}
