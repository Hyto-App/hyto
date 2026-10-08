import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { prepararBaseDe } from "../../lib/config/entorno";
import { ocultarUrl } from "../../lib/db/diff-esquema";
import { cargarEnvLocal } from "../cargar-env-local";
import {
  CONSULTA_COLUMNAS,
  aSql,
  columnasDelPlan,
  columnasFaltantes,
  filasDemo,
  mensajeColumnasFaltantes,
  revisarArgumentos,
  revisarBandera,
  sqlPermitido,
  tablasDe,
  textoPrueba,
  type Columna,
} from "./plan-demo";

type Sentencia = { texto: string; valores: readonly unknown[] };

export type Lote = {
  consultar(texto: string, valores?: readonly unknown[]): Promise<{ rows: Columna[]; rowCount: number }>;
  transaccion(sentencias: readonly Sentencia[]): Promise<number[]>;
};

export async function sembrarCon(lote: Lote): Promise<{ codigo: number; insertadas: number; mensaje: string }> {
  const filas = filasDemo();
  const leido = await lote.consultar(CONSULTA_COLUMNAS, [tablasDe(filas)]);
  const aviso = mensajeColumnasFaltantes(columnasFaltantes(leido.rows, columnasDelPlan(filas)));
  if (aviso) return { codigo: 1, insertadas: 0, mensaje: aviso };
  const sentencias = filas.map((filaInsert) => {
    const sentencia = aSql(filaInsert);
    if (!sqlPermitido(sentencia.texto)) throw new Error("La sentencia no es un insert permitido.");
    return sentencia;
  });
  const cuentas = await lote.transaccion(sentencias);
  const insertadas = cuentas.reduce((total, cuenta) => total + cuenta, 0);
  const omitidas = filas.length - insertadas;
  return {
    codigo: 0,
    insertadas,
    mensaje: `Semilla demo lista. Insertadas: ${insertadas}. Ya estaban y se dejaron igual: ${omitidas}.`,
  };
}

function lotePg(client: Client): Lote {
  return {
    async consultar(texto, valores) {
      const resultado = await client.query<{ table_name: string; column_name: string }>(texto, valores ? [...valores] : []);
      return {
        rows: resultado.rows.map((fila) => ({ tabla: fila.table_name, columna: fila.column_name })),
        rowCount: resultado.rowCount ?? 0,
      };
    },
    async transaccion(sentencias) {
      await client.query("begin");
      try {
        const cuentas: number[] = [];
        for (const sentencia of sentencias) {
          const resultado = await client.query(sentencia.texto, [...sentencia.valores]);
          cuentas.push(resultado.rowCount ?? 0);
        }
        await client.query("commit");
        return cuentas;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    },
  };
}

async function escribir(url: string): Promise<number> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10_000, statement_timeout: 30_000 });
  await client.connect();
  try {
    const resultado = await sembrarCon(lotePg(client));
    if (resultado.codigo === 0) console.log(resultado.mensaje);
    else console.error(resultado.mensaje);
    return resultado.codigo;
  } finally {
    await client.end();
  }
}

export async function correrSemilla(
  env: { [clave: string]: string | undefined },
  argv: readonly string[],
): Promise<number> {
  const bandera = revisarBandera(env.HYTO_SEED_DEMO);
  if (!bandera.ok) {
    console.error(bandera.mensaje);
    return 1;
  }
  const args = revisarArgumentos(argv);
  if (!args.ok) {
    console.error(args.mensaje);
    return 1;
  }
  if (args.prueba) {
    console.log(textoPrueba());
    return 0;
  }
  const preparada = prepararBaseDe(env);
  if (!preparada.ok) {
    console.error(preparada.mensaje);
    return 1;
  }
  if (preparada.aviso) console.error(preparada.aviso);
  try {
    return await escribir(preparada.url);
  } catch (error: unknown) {
    const texto = error instanceof Error ? error.message : "No se pudo sembrar.";
    console.error(ocultarUrl(texto));
    return 1;
  }
}

function esEntrada(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  return import.meta.url === pathToFileURL(arg).href;
}

if (esEntrada()) {
  const lineas = cargarEnvLocal();
  if (lineas > 0) process.exit(1);
  correrSemilla(process.env, process.argv.slice(2)).then((codigo) => {
    process.exit(codigo);
  });
}
