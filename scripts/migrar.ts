import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { sentencias } from "../lib/db/sql";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL. Sin esa variable no hay base.");
  process.exit(1);
}
const base = url;

async function main(): Promise<void> {
  const sql = neon(base);
  const archivo = readFileSync("drizzle/0000_inicio.sql", "utf8");
  for (const sentencia of sentencias(archivo)) {
    await sql.query(sentencia);
  }
  console.log("La base ya tiene las tablas.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No se pudo migrar.");
  process.exit(1);
});
