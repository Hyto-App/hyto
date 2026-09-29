import { crearAlmacenNeon } from "../lib/db/neon";
import { asegurarSemilla } from "../lib/db/semilla";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL. Sin esa variable no hay base.");
  process.exit(1);
}
const base = url;

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
