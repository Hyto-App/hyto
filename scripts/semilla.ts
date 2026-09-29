import { crearAlmacenNeon } from "../lib/db/neon";
import { asegurarSemilla } from "../lib/db/semilla";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Falta DATABASE_URL. Sin esa variable no hay base.");
  process.exit(1);
}

try {
  await asegurarSemilla(crearAlmacenNeon(url));
  console.log("La semilla de ZEEK ya está.");
} catch {
  console.error("No se pudo sembrar. Corre npm run db:migrar si faltan las tablas.");
  process.exit(1);
}
