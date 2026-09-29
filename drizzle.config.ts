import { defineConfig } from "drizzle-kit";
import { prepararBaseDe } from "./lib/config/entorno";
import { cargarEnvLocal } from "./scripts/cargar-env-local";

cargarEnvLocal();
const preparada = prepararBaseDe(process.env);
if (!preparada.ok) {
  throw new Error(preparada.mensaje);
}
if (preparada.aviso) console.error(preparada.aviso);

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: preparada.url,
  },
});
