import { prepararBaseDe } from "../lib/config/entorno";
import { crearAlmacenNeon } from "../lib/db/neon";
import { asegurarSemilla } from "../lib/db/semilla";
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
  try {
    await asegurarSemilla(crearAlmacenNeon(base));
    console.log("La semilla de ZEEK ya está.");
  } catch {
    console.error("No se pudo sembrar. Corre npm run db:migrar si faltan las tablas.");
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No se pudo sembrar.");
  process.exit(1);
});
