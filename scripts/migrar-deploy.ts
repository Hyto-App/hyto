import { hostDeDatabaseUrl } from "../lib/config/entorno";
import { aplicarMigraciones } from "../lib/db/aplicar";

/**
 * Vercel build step. Applies drizzle/*.sql to the DATABASE_URL of this
 * deployment only. The statements are additive (`IF NOT EXISTS`). It does not
 * turn feature switches on. Local `npm run db:migrar` keeps its own guard.
 */
export type DecisionDeploy =
  | { accion: "omitir"; motivo: string }
  | { accion: "migrar"; host: string; url: string }
  | { accion: "fallar"; motivo: string };

export function decidirMigracionDeploy(env: Record<string, string | undefined>): DecisionDeploy {
  if (env.VERCEL !== "1") return { accion: "omitir", motivo: "This is not a Vercel build." };
  const entorno = env.VERCEL_ENV?.trim();
  if (entorno !== "production" && entorno !== "preview") {
    return { accion: "omitir", motivo: "This Vercel environment does not deploy the app." };
  }
  const url = env.DATABASE_URL?.trim() ?? "";
  if (!url) {
    if (entorno === "production") {
      return { accion: "fallar", motivo: "The production build has no DATABASE_URL, so the schema was not applied." };
    }
    return { accion: "omitir", motivo: "This preview build has no DATABASE_URL." };
  }
  const host = hostDeDatabaseUrl(url);
  if (!host) return { accion: "fallar", motivo: "DATABASE_URL cannot be read as a URL, so the schema was not applied." };
  return { accion: "migrar", host, url };
}

function redactar(texto: string): string {
  return texto.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted");
}

async function main(): Promise<void> {
  const decision = decidirMigracionDeploy(process.env);
  if (decision.accion === "omitir") {
    console.log(`migrar-deploy: skipped. ${decision.motivo}`);
    return;
  }
  if (decision.accion === "fallar") {
    console.error(`migrar-deploy: ${decision.motivo}`);
    process.exit(1);
  }
  console.log(`migrar-deploy: applying drizzle/*.sql on ${decision.host}`);
  try {
    await aplicarMigraciones(decision.url);
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : "The migration failed.";
    console.error(`migrar-deploy: ${redactar(mensaje)}`);
    process.exit(1);
  }
  console.log("migrar-deploy: schema is current. Feature switches were not changed.");
}

const entrada = (process.argv[1] ?? "").split("\\").join("/");
if (entrada.endsWith("/migrar-deploy.ts") || entrada.endsWith("/migrar-deploy.js")) {
  main().catch((error: unknown) => {
    const mensaje = error instanceof Error ? error.message : "The migration failed.";
    console.error(`migrar-deploy: ${redactar(mensaje)}`);
    process.exit(1);
  });
}
