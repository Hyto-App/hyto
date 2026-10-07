import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import { urlDeBase } from "@/lib/config/entorno";
import { esHostNeon } from "@/lib/db/host";
import { json } from "./json";

const TOPE_MS = 4000;

export type CuerpoSalud = {
  ok: boolean;
  status: "ok" | "down";
  version: string | null;
  db: "up" | "down";
};

type EntornoVersion = {
  VERCEL_GIT_COMMIT_SHA?: string;
  npm_package_version?: string;
};

/** Git sha when the host provides one, otherwise the package version. Nothing else from the environment. */
export function versionDeApp(env: EntornoVersion): string | null {
  const sha = env.VERCEL_GIT_COMMIT_SHA?.trim() ?? "";
  if (/^[0-9a-f]{7,40}$/i.test(sha)) return sha.toLowerCase();
  const version = env.npm_package_version?.trim() ?? "";
  if (version && version.length <= 40 && !/[\s/]/.test(version)) return version;
  return null;
}

export function armarSalud(dbOk: boolean, version: string | null): { status: number; cuerpo: CuerpoSalud } {
  return {
    status: dbOk ? 200 : 503,
    cuerpo: {
      ok: dbOk,
      status: dbOk ? "ok" : "down",
      version,
      db: dbOk ? "up" : "down",
    },
  };
}

function conTope(trabajo: Promise<unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), TOPE_MS);
    trabajo.then(
      () => {
        clearTimeout(id);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(id);
        reject(error instanceof Error ? error : new Error("database"));
      },
    );
  });
}

async function pingPg(url: string): Promise<void> {
  const pool = new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: TOPE_MS,
    allowExitOnIdle: true,
  });
  try {
    await conTope(pool.query("select 1"));
  } finally {
    await pool.end().catch(() => undefined);
  }
}

/** True only when a one-row read succeeds. A missing URL counts as unreachable. */
export async function baseAlcanzable(url: string | null = urlDeBase()): Promise<boolean> {
  const limpia = url?.trim() ?? "";
  if (!limpia) return false;
  try {
    if (esHostNeon(limpia)) {
      const sql = neon(limpia, {
        readOnly: true,
        fetchOptions: { signal: AbortSignal.timeout(TOPE_MS) },
      });
      await conTope(sql`select 1`);
      return true;
    }
    await pingPg(limpia);
    return true;
  } catch {
    console.error("[api/health] database check failed");
    return false;
  }
}

export async function responderSalud(
  probar: () => Promise<boolean> = () => baseAlcanzable(),
  version: string | null = versionDeApp(process.env),
): Promise<Response> {
  let dbOk = false;
  try {
    dbOk = await probar();
  } catch {
    dbOk = false;
  }
  const { status, cuerpo } = armarSalud(dbOk, version);
  return json(cuerpo, status, { "cache-control": "no-store" });
}
