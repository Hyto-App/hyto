import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { prepararBaseDe } from "../lib/config/entorno";
import { sentencias } from "../lib/db/sql";
import { cargarEnvLocal } from "./cargar-env-local";

const lineasOmitidas = cargarEnvLocal();
if (lineasOmitidas > 0) process.exit(1);
const preparada = prepararBaseDe(process.env);
if (!preparada.ok) {
  console.error(preparada.mensaje);
  process.exit(1);
}
if (preparada.aviso) console.error(preparada.aviso);
const base = preparada.url;

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
