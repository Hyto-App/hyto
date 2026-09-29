import { prepararBaseDe } from "../lib/config/entorno";
import { cerrarPools, crearAlmacenNeon } from "../lib/db/neon";
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

async function main(): Promise<number> {
  try {
    await asegurarSemilla(crearAlmacenNeon(base));
    console.log("La semilla de ZEEK ya está.");
    return 0;
  } catch (error: unknown) {
    const detalle = error instanceof Error ? error.message : "";
    console.error(detalle ? `No se pudo sembrar. ${detalle}` : "No se pudo sembrar. Corre npm run db:migrar si faltan las tablas.");
    return 1;
  } finally {
    await cerrarPools();
  }
}

main().then((codigo) => {
  process.exit(codigo);
});
