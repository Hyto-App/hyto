import { prepararBaseDe } from "../lib/config/entorno";
import { aplicarMigraciones } from "../lib/db/aplicar";
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

// Aplica drizzle/0000_inicio.sql y el resto de drizzle/*.sql, en orden de nombre.
aplicarMigraciones(base)
  .then(() => {
    console.log("La base ya tiene las tablas.");
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "No se pudo migrar.");
    process.exit(1);
  });
