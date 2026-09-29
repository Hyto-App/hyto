import { aplicarArchivo } from "../lib/db/aplicar";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL. Sin esa variable no hay base.");
  process.exit(1);
}
const base = url;

aplicarArchivo(base)
  .then(() => {
    console.log("La base ya tiene las tablas.");
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "No se pudo migrar.");
    process.exit(1);
  });
