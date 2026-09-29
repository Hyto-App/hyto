import { existsSync, readFileSync } from "node:fs";
import { aplicarEnvLocal, mensajeLineasOmitidas, parsearEnv } from "../lib/config/entorno";

export function cargarEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  let texto: string;
  try {
    texto = readFileSync(".env.local", "utf8");
  } catch {
    console.error("No se pudo leer .env.local. No se muestra su contenido.");
    process.exit(1);
  }
  const parseo = parsearEnv(texto);
  if (parseo.lineasOmitidas > 0) console.error(mensajeLineasOmitidas(parseo.lineasOmitidas));
  aplicarEnvLocal(parseo.valores);
}
