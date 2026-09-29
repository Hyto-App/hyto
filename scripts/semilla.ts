import { cerrarPools, crearAlmacenNeon } from "../lib/db/neon";
import { asegurarSemilla } from "../lib/db/semilla";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL. Sin esa variable no hay base.");
  process.exit(1);
}
const base = url;

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
