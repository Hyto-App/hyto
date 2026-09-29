import { prepararBaseDe } from "../lib/config/entorno";
import { aplicarArchivo } from "../lib/db/aplicar";
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

aplicarArchivo(base)
  .then(() => {
    console.log("La base ya tiene las tablas.");
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "No se pudo migrar.");
    process.exit(1);
  });
