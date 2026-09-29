import { spawnSync } from "node:child_process";
import { esHostLocal, urlLocal } from "./url-local";

export const CLAVES_REMOTAS = [
  "DATABASE_URL",
  "BLOB_READ_WRITE_TOKEN",
  "GROQ_API_KEY",
  "LAYA_URL",
  "LAYA_API_KEY",
  "TRUSTLESS_API_KEY",
  "NEXT_PUBLIC_CAVOS_APP_ID",
  "CAVOS_JWT_JWK",
  "CAVOS_JWKS_URL",
  "CAVOS_JWT_ISSUER",
  "CAVOS_JWT_AUDIENCE",
] as const;

export type GanchosPrueba = {
  __HYTO_ALMACEN_PRUEBA?: () => Promise<unknown>;
  __HYTO_FOTOS_PRUEBA?: () => unknown;
};

export type PlanSuite = {
  conectar: boolean;
  motivo: false | string;
};

const MOTIVO_REMOTO = "la URL no apunta a una base local";

let cerrado = false;

/** Decide si la suite puede intentar una conexión. Una URL remota no se abre. */
export function planDeSuite(url: string): PlanSuite {
  if (!esHostLocal(url)) return { conectar: false, motivo: MOTIVO_REMOTO };
  return { conectar: true, motivo: false };
}

export function planDeEntorno(env: NodeJS.ProcessEnv = process.env): PlanSuite {
  return planDeSuite(urlLocal(env));
}

/**
 * Motivo para `describe({ skip })`. `false` deja correr la suite.
 * Una URL remota no consulta el servidor: el booleano solo aplica si el host ya es local.
 */
export function motivoDeGuardia(url: string, hayServidor: boolean): false | string {
  const plan = planDeSuite(url);
  if (!plan.conectar) return typeof plan.motivo === "string" ? plan.motivo : MOTIVO_REMOTO;
  if (!hayServidor) return "no hay base local";
  return false;
}

export function motivoSuiteSync(env: NodeJS.ProcessEnv = process.env): false | string {
  const url = urlLocal(env);
  const plan = planDeSuite(url);
  if (!plan.conectar) return motivoDeGuardia(url, false);
  return motivoDeGuardia(url, respondeLocal(url));
}

function respondeLocal(url: string): boolean {
  if (!esHostLocal(url)) return false;
  const script = `
    const pg = require("pg");
    const cliente = new pg.Client({
      connectionString: process.env.HYTO_PROBE_URL,
      connectionTimeoutMillis: 2000,
    });
    cliente.connect().then(() => cliente.end()).then(() => process.exit(0), () => process.exit(1));
  `;
  const resultado = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    timeout: 4000,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      NODE_PATH: process.env.NODE_PATH ?? "",
      NODE_ENV: process.env.NODE_ENV ?? "test",
      HYTO_PROBE_URL: url,
    },
  });
  return resultado.status === 0;
}

/**
 * Quita credenciales remotas y deja los ganchos en vacío.
 * Así las rutas no pueden escribir en Neon ni en Blob aunque un test llegue a correr.
 */
export function cerrarEscriturasRemotas(env: Record<string, string | undefined>, ganchos: GanchosPrueba): void {
  for (const clave of CLAVES_REMOTAS) delete env[clave];
  ganchos.__HYTO_ALMACEN_PRUEBA = async () => null;
  ganchos.__HYTO_FOTOS_PRUEBA = () => null;
}

export function asegurarCerrado(): void {
  if (cerrado) return;
  cerrado = true;
  cerrarEscriturasRemotas(process.env, globalThis as typeof globalThis & GanchosPrueba);
}
