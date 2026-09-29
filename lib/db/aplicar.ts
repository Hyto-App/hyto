import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { Client } from "pg";
import { esHostNeon } from "./host";
import { sentencias } from "./sql";

// El cliente HTTP de Neon reescribe el primer tramo del host (`127.` -> `api.`)
// y termina pidiendo `https://api.0.0.1/sql`. Contra Postgres local hay que usar el protocolo normal.
export async function aplicarMigraciones(url: string, directorio = "drizzle"): Promise<void> {
  const nombres = readdirSync(directorio)
    .filter((nombre) => nombre.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
  for (const nombre of nombres) await aplicarArchivo(url, join(directorio, nombre));
}

export async function aplicarArchivo(url: string, ruta = "drizzle/0000_inicio.sql"): Promise<void> {
  const lista = sentencias(readFileSync(ruta, "utf8"));
  if (esHostNeon(url)) {
    const sql = neon(url);
    for (const sentencia of lista) await sql.query(sentencia);
    return;
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const sentencia of lista) await client.query(sentencia);
  } finally {
    await client.end();
  }
}
