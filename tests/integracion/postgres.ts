import { readFileSync } from "node:fs";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Fotos } from "../../lib/blob/fotos";
import { crearFotosMemoria } from "../../lib/blob/fotos";
import type { Almacen } from "../../lib/db/almacen";
import { crearAlmacenDesde, type DbAlmacen } from "../../lib/db/neon";
import { sentencias } from "../../lib/db/sql";
import { asegurarCerrado, planDeEntorno } from "./guardia";
import { urlLocal } from "./url-local";

type GanchoAlmacen = () => Promise<Almacen | null>;
type GanchoFotos = () => Fotos | null;

const globales = globalThis as typeof globalThis & {
  __HYTO_ALMACEN_PRUEBA?: GanchoAlmacen;
  __HYTO_FOTOS_PRUEBA?: GanchoFotos;
};

let pool: pg.Pool | null = null;
let almacen: Almacen | null = null;
let fotos: Fotos | null = null;
let candado: pg.PoolClient | null = null;
let lista = false;
let preparación: Promise<SuiteLocal> | null = null;

export type SuiteLocal = {
  lista: boolean;
  motivo: false | string;
};

export function baseLista(): boolean {
  return lista;
}

export function almacenDePrueba(): Almacen {
  if (!almacen) throw new Error("No hay base local.");
  return almacen;
}

export function usarAlmacen(gancho: GanchoAlmacen): void {
  globales.__HYTO_ALMACEN_PRUEBA = gancho;
}

export function usarFotos(gancho: GanchoFotos): void {
  globales.__HYTO_FOTOS_PRUEBA = gancho;
}

export function prepararSuite(): Promise<SuiteLocal> {
  preparación ??= prepararUnaVez();
  return preparación;
}

async function prepararUnaVez(): Promise<SuiteLocal> {
  asegurarCerrado();
  const plan = planDeEntorno();
  if (!plan.conectar) {
    console.log(`test:integracion: ${plan.motivo}; se omite sin conectar.`);
    return { lista: false, motivo: plan.motivo };
  }
  const url = urlLocal();
  pool = new pg.Pool({
    connectionString: url,
    max: 4,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 500,
    allowExitOnIdle: true,
  });
  pool.on("error", () => undefined);
  const cliente = await pool.connect().catch(() => null);
  if (!cliente) {
    console.log("test:integracion: no hay base Postgres local; se omite.");
    await pool.end().catch(() => undefined);
    pool = null;
    return { lista: false, motivo: "no hay base local" };
  }
  try {
    const sql = readFileSync("drizzle/0000_inicio.sql", "utf8");
    for (const sentencia of sentencias(sql)) {
      await cliente.query(sentencia);
    }
  } catch (error) {
    cliente.release();
    await pool.end().catch(() => undefined);
    pool = null;
    throw error;
  }
  cliente.release();
  process.env.DATABASE_URL = url;
  almacen = crearAlmacenDesde(drizzle(pool) as unknown as DbAlmacen);
  fotos = crearFotosMemoria();
  usarAlmacen(async () => almacen);
  usarFotos(() => fotos);
  lista = true;
  return { lista: true, motivo: false };
}

export async function tomar(): Promise<void> {
  if (!pool || !almacen) throw new Error("No hay base local.");
  const cliente = await pool.connect();
  try {
    await cliente.query("SELECT pg_advisory_lock(841814)");
    await cliente.query(
      "TRUNCATE veredictos, evidencias, sesiones, tareas, proyectos, usuarios RESTART IDENTITY CASCADE",
    );
    fotos = crearFotosMemoria();
    usarFotos(() => fotos);
    usarAlmacen(async () => almacen);
    candado = cliente;
  } catch (error) {
    cliente.release();
    throw error;
  }
}

export async function soltar(): Promise<void> {
  if (!candado) return;
  const cliente = candado;
  candado = null;
  try {
    await cliente.query("SELECT pg_advisory_unlock(841814)");
  } finally {
    cliente.release();
  }
}

export async function consulta<T extends pg.QueryResultRow = pg.QueryResultRow>(
  texto: string,
  valores: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  if (!pool) throw new Error("No hay base local.");
  return pool.query<T>(texto, valores);
}
