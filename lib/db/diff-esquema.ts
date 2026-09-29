import {
  normalizarDefault,
  normalizarTipo,
  type EsquemaEsperado,
  type FkEsperada,
  type GrupoColumnas,
} from "./esquema-migracion";

export const CONSULTAS = {
  tablas: `SELECT table_name AS tabla
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name`,
  columnas: `SELECT
  c.table_name AS tabla,
  c.column_name AS columna,
  c.data_type AS tipo_dato,
  c.udt_name AS udt,
  c.is_nullable AS nulable,
  c.column_default AS defecto,
  c.character_maximum_length AS largo,
  c.numeric_precision AS precision_num,
  c.numeric_scale AS escala
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema
 AND t.table_name = c.table_name
WHERE c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY c.table_name, c.ordinal_position`,
  restricciones: `SELECT
  con.contype AS tipo,
  con.conname AS nombre,
  src.relname AS tabla,
  att.attname AS columna,
  ck.ord AS orden,
  dst.relname AS tabla_ref,
  fatt.attname AS columna_ref,
  con.confdeltype AS al_borrar
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = src.relnamespace
JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
JOIN pg_attribute att ON att.attrelid = src.oid AND att.attnum = ck.attnum
LEFT JOIN pg_class dst ON dst.oid = con.confrelid
LEFT JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS fk(attnum, ord) ON fk.ord = ck.ord
LEFT JOIN pg_attribute fatt ON fatt.attrelid = dst.oid AND fatt.attnum = fk.attnum
WHERE nsp.nspname = 'public'
  AND con.contype IN ('p', 'u', 'f')
ORDER BY src.relname, con.contype, con.conname, ck.ord`,
  indices: `SELECT t.relname AS tabla, i.relname AS indice
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace nsp ON nsp.oid = t.relnamespace
WHERE nsp.nspname = 'public'
  AND ix.indisprimary = false
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    WHERE con.conindid = ix.indexrelid
  )
ORDER BY t.relname, i.relname`,
} as const;

export const ORDEN_CONSULTAS = [CONSULTAS.tablas, CONSULTAS.columnas, CONSULTAS.restricciones, CONSULTAS.indices] as const;

const PROHIBIDO =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment|merge|copy|call|do|vacuum|analyze|refresh|reindex|cluster|lock|set|begin|commit|rollback)\b/i;

export function esConsultaSoloLectura(consulta: string): boolean {
  const limpia = consulta.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--.*$/gm, " ").trim();
  if (!/^select\b/i.test(limpia)) return false;
  if (limpia.includes(";")) return false;
  return !PROHIBIDO.test(limpia);
}

export function exigirDatabaseUrl(valor: string | undefined): { ok: true; url: string } | { ok: false; mensaje: string } {
  const url = valor?.trim() ?? "";
  if (!url) {
    return { ok: false, mensaje: "Falta DATABASE_URL. Sin esa variable este script no corre y no toca la base." };
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, mensaje: "DATABASE_URL no es una URL. No se consulta la base." };
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return { ok: false, mensaje: "DATABASE_URL tiene que ser postgres o postgresql. No se consulta la base." };
  }
  if (!parsed.username || !parsed.hostname || parsed.pathname === "" || parsed.pathname === "/") {
    return { ok: false, mensaje: "DATABASE_URL no tiene el formato postgresql://usuario@host/base. No se consulta la base." };
  }
  return { ok: true, url };
}

export function ocultarUrl(texto: string): string {
  return texto.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://…");
}

export type LecturaEsquema = {
  tablas: Record<string, unknown>[];
  columnas: Record<string, unknown>[];
  restricciones: Record<string, unknown>[];
  indices: Record<string, unknown>[];
};

export type ColumnaObservada = {
  tabla: string;
  nombre: string;
  tipo: string;
  nullable: boolean;
  defecto: string | null;
};

export type FkObservada = {
  tabla: string;
  columnas: string[];
  tablaRef: string;
  columnasRef: string[];
  alBorrar: string;
};

export type EsquemaObservado = {
  tablas: string[];
  columnas: ColumnaObservada[];
  primaryKeys: GrupoColumnas[];
  uniques: GrupoColumnas[];
  fks: FkObservada[];
  indices: { tabla: string; nombre: string }[];
};

export type Diferencia = {
  mensaje: string;
};

export function observadoDesdeFilas(lectura: LecturaEsquema): EsquemaObservado {
  const tablas = lectura.tablas.map((fila) => texto(fila, "tabla"));
  const columnas = lectura.columnas.map((fila) => ({
    tabla: texto(fila, "tabla"),
    nombre: texto(fila, "columna"),
    tipo: tipoObservado(fila),
    nullable: texto(fila, "nulable").toUpperCase() === "YES",
    defecto: normalizarDefault(textoONull(fila, "defecto")),
  }));
  const primaryKeys: GrupoColumnas[] = [];
  const uniques: GrupoColumnas[] = [];
  const fks: FkObservada[] = [];
  for (const grupo of agruparRestricciones(lectura.restricciones)) {
    if (grupo.tipo === "p") primaryKeys.push({ tabla: grupo.tabla, columnas: grupo.columnas });
    if (grupo.tipo === "u") uniques.push({ tabla: grupo.tabla, columnas: grupo.columnas });
    if (grupo.tipo === "f") {
      fks.push({
        tabla: grupo.tabla,
        columnas: grupo.columnas,
        tablaRef: grupo.tablaRef,
        columnasRef: grupo.columnasRef,
        alBorrar: grupo.alBorrar,
      });
    }
  }
  const indices = lectura.indices.map((fila) => ({ tabla: texto(fila, "tabla"), nombre: texto(fila, "indice") }));
  return {
    tablas: [...new Set(tablas)].sort((a, b) => a.localeCompare(b)),
    columnas,
    primaryKeys,
    uniques,
    fks,
    indices,
  };
}

export function compararEsquema(esperado: EsquemaEsperado, observado: EsquemaObservado): Diferencia[] {
  const diferencias: Diferencia[] = [];
  const tablasEsperadas = new Set(esperado.tablas);
  const tablasVistas = new Set(observado.tablas);
  for (const tabla of esperado.tablas) {
    if (!tablasVistas.has(tabla)) diferencias.push({ mensaje: `Falta en la base la tabla ${tabla}.` });
  }
  for (const tabla of observado.tablas) {
    if (!tablasEsperadas.has(tabla)) diferencias.push({ mensaje: `La base tiene la tabla ${tabla}, que las migraciones no declaran.` });
  }
  for (const tabla of esperado.tablas) {
    if (!tablasVistas.has(tabla)) continue;
    const esperadas = esperado.columnas.filter((columna) => columna.tabla === tabla);
    const vistas = observado.columnas.filter((columna) => columna.tabla === tabla);
    const porNombre = new Map(vistas.map((columna) => [columna.nombre, columna]));
    for (const columna of esperadas) {
      const vista = porNombre.get(columna.nombre);
      if (!vista) {
        diferencias.push({ mensaje: `Falta en la base la columna ${tabla}.${columna.nombre}.` });
        continue;
      }
      porNombre.delete(columna.nombre);
      if (vista.tipo !== columna.tipo) {
        diferencias.push({
          mensaje: `${tabla}.${columna.nombre}: la base tiene tipo ${vista.tipo} y las migraciones ${columna.tipo}.`,
        });
      }
      if (vista.nullable !== columna.nullable) {
        diferencias.push({
          mensaje: vista.nullable
            ? `${tabla}.${columna.nombre}: en la base acepta null y en las migraciones es NOT NULL.`
            : `${tabla}.${columna.nombre}: en la base es NOT NULL y en las migraciones acepta null.`,
        });
      }
      const defectoEsperado = normalizarDefault(columna.defecto);
      if (vista.defecto !== defectoEsperado) {
        diferencias.push({
          mensaje: `${tabla}.${columna.nombre}: default en la base ${mostrarDefault(vista.defecto)} y en las migraciones ${mostrarDefault(defectoEsperado)}.`,
        });
      }
    }
    for (const extra of porNombre.values()) {
      diferencias.push({ mensaje: `La base tiene la columna ${tabla}.${extra.nombre}, que las migraciones no declaran.` });
    }
    compararGrupos(diferencias, "llave primaria", tabla, esperado.primaryKeys, observado.primaryKeys);
    compararGrupos(diferencias, "UNIQUE", tabla, esperado.uniques, observado.uniques);
  }
  compararFks(diferencias, esperado.fks, observado.fks);
  compararIndices(diferencias, esperado, observado);
  return diferencias;
}

export async function consultarLoteReadOnly<T>(
  sql: {
    query: (consulta: string) => T;
    transaction: (lote: T[], opciones: { readOnly: true }) => Promise<unknown[]>;
  },
  consultas: readonly string[],
): Promise<unknown[]> {
  for (const consulta of consultas) {
    if (!esConsultaSoloLectura(consulta)) {
      throw new Error("Este script solo ejecuta SELECT. No escribe en la base.");
    }
  }
  const lote = consultas.map((consulta) => sql.query(consulta));
  return sql.transaction(lote, { readOnly: true });
}

export function lecturaDesdeLote(lote: unknown[]): LecturaEsquema {
  if (lote.length !== ORDEN_CONSULTAS.length) {
    throw new Error("La lectura no devolvió el lote esperado. No se escribe en la base.");
  }
  return {
    tablas: filas(lote[0]),
    columnas: filas(lote[1]),
    restricciones: filas(lote[2]),
    indices: filas(lote[3]),
  };
}

function compararGrupos(
  diferencias: Diferencia[],
  etiqueta: string,
  tabla: string,
  esperados: GrupoColumnas[],
  observados: GrupoColumnas[],
): void {
  const clave = (grupo: GrupoColumnas) => grupo.columnas.join(", ");
  const quiere = esperados.filter((grupo) => grupo.tabla === tabla).map(clave).sort();
  const tiene = observados.filter((grupo) => grupo.tabla === tabla).map(clave).sort();
  for (const grupo of quiere) {
    if (!tiene.includes(grupo)) diferencias.push({ mensaje: `Falta en la base ${etiqueta} de ${tabla} (${grupo}).` });
  }
  for (const grupo of tiene) {
    if (!quiere.includes(grupo)) {
      diferencias.push({ mensaje: `La base tiene ${etiqueta} de ${tabla} (${grupo}), que las migraciones no declaran.` });
    }
  }
}

function compararFks(diferencias: Diferencia[], esperadas: FkEsperada[], observadas: FkObservada[]): void {
  const clave = (fk: { tabla: string; columnas: string[]; tablaRef: string; columnasRef: string[] }) =>
    `${fk.tabla} (${fk.columnas.join(", ")}) → ${fk.tablaRef} (${fk.columnasRef.join(", ")})`;
  const vistas = new Map(observadas.map((fk) => [clave(fk), fk]));
  for (const fk of esperadas) {
    const id = clave(fk);
    const vista = vistas.get(id);
    if (!vista) {
      diferencias.push({ mensaje: `Falta en la base la FK ${id}.` });
      continue;
    }
    vistas.delete(id);
    if (vista.alBorrar !== fk.alBorrar) {
      diferencias.push({
        mensaje: `La FK ${id} en la base usa ON DELETE ${nombreAccion(vista.alBorrar)} y las migraciones ${fk.alBorrarExplicito ? nombreAccion(fk.alBorrar) : "no lo declaran (Postgres queda en NO ACTION)"}. Confirmar con Esteban.`,
      });
    }
  }
  for (const id of vistas.keys()) {
    diferencias.push({ mensaje: `La base tiene la FK ${id}, que las migraciones no declaran.` });
  }
}

function compararIndices(diferencias: Diferencia[], esperado: EsquemaEsperado, observado: EsquemaObservado): void {
  const quiere = new Set(esperado.indices.map((indice) => indice.nombre));
  const tiene = new Map(observado.indices.map((indice) => [indice.nombre, indice]));
  for (const indice of esperado.indices) {
    if (!tiene.has(indice.nombre)) diferencias.push({ mensaje: `Falta en la base el índice ${indice.nombre} de ${indice.tabla}.` });
  }
  for (const [nombre, indice] of tiene) {
    if (!quiere.has(nombre)) {
      diferencias.push({ mensaje: `La base tiene el índice secundario ${nombre} en ${indice.tabla}, que las migraciones no declaran.` });
    }
  }
}

function agruparRestricciones(filasRestriccion: Record<string, unknown>[]): {
  tipo: string;
  tabla: string;
  columnas: string[];
  tablaRef: string;
  columnasRef: string[];
  alBorrar: string;
}[] {
  const grupos = new Map<string, { tipo: string; tabla: string; pares: { orden: number; columna: string; tablaRef: string; columnaRef: string }[]; alBorrar: string }>();
  for (const fila of filasRestriccion) {
    const nombre = texto(fila, "nombre");
    const tipo = texto(fila, "tipo").toLowerCase();
    const actual = grupos.get(nombre) ?? {
      tipo,
      tabla: texto(fila, "tabla"),
      pares: [],
      alBorrar: tipo === "f" ? accionLeida(fila) : "a",
    };
    actual.pares.push({
      orden: numero(fila, "orden"),
      columna: texto(fila, "columna"),
      tablaRef: textoONull(fila, "tabla_ref") ?? "",
      columnaRef: textoONull(fila, "columna_ref") ?? "",
    });
    grupos.set(nombre, actual);
  }
  return [...grupos.values()].map((grupo) => {
    const pares = grupo.pares.sort((a, b) => a.orden - b.orden);
    return {
      tipo: grupo.tipo,
      tabla: grupo.tabla,
      columnas: pares.map((par) => par.columna),
      tablaRef: pares[0]?.tablaRef ?? "",
      columnasRef: pares.map((par) => par.columnaRef),
      alBorrar: grupo.alBorrar,
    };
  });
}

function tipoObservado(fila: Record<string, unknown>): string {
  const data = texto(fila, "tipo_dato").toLowerCase();
  const udt = textoONull(fila, "udt") ?? "";
  const largo = numeroONull(fila, "largo");
  const precision = numeroONull(fila, "precision_num");
  const escala = numeroONull(fila, "escala");
  if (data === "character varying") return normalizarTipo(largo ? `character varying(${largo})` : "character varying");
  if (data === "character") return normalizarTipo(largo ? `character(${largo})` : "character");
  if ((data === "numeric" || data === "decimal") && precision != null) {
    return normalizarTipo(escala != null ? `${data}(${precision},${escala})` : `${data}(${precision})`);
  }
  if (data === "user-defined") return normalizarTipo(udt);
  if (data === "array") return `${normalizarTipo(udt.replace(/^_/, ""))}[]`;
  return normalizarTipo(data);
}

function accionLeida(fila: Record<string, unknown>): string {
  const valor = textoONull(fila, "al_borrar");
  if (!valor) return "";
  return valor.trim().toLowerCase();
}

function nombreAccion(codigo: string): string {
  if (codigo === "a") return "NO ACTION";
  if (codigo === "r") return "RESTRICT";
  if (codigo === "c") return "CASCADE";
  if (codigo === "n") return "SET NULL";
  if (codigo === "d") return "SET DEFAULT";
  if (!codigo) return "una acción que no vino en la lectura";
  return codigo;
}

function mostrarDefault(valor: string | null): string {
  return valor == null ? "null" : valor;
}

function filas(valor: unknown): Record<string, unknown>[] {
  if (!Array.isArray(valor)) throw new Error("La lectura no devolvió filas. No se escribe en la base.");
  return valor.map((fila) => {
    if (!fila || typeof fila !== "object" || Array.isArray(fila)) {
      throw new Error("La lectura no devolvió filas. No se escribe en la base.");
    }
    return fila as Record<string, unknown>;
  });
}

function texto(fila: Record<string, unknown>, clave: string): string {
  const valor = fila[clave];
  if (typeof valor !== "string" || valor.length === 0) {
    throw new Error(`Falta ${clave} en la lectura del esquema. No se escribe en la base.`);
  }
  return valor;
}

function textoONull(fila: Record<string, unknown>, clave: string): string | null {
  const valor = fila[clave];
  if (valor == null) return null;
  return typeof valor === "string" ? valor : String(valor);
}

function numero(fila: Record<string, unknown>, clave: string): number {
  const valor = numeroONull(fila, clave);
  if (valor == null) throw new Error(`Falta ${clave} en la lectura del esquema. No se escribe en la base.`);
  return valor;
}

function numeroONull(fila: Record<string, unknown>, clave: string): number | null {
  const valor = fila[clave];
  if (valor == null || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n)) return null;
  return n;
}
