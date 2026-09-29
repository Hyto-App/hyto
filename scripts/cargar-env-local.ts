import { existsSync, readFileSync } from "node:fs";
import { aplicarEnvLocal, mensajeLineasOmitidas, parsearEnv } from "../lib/config/entorno";

export function cargarEnvLocal(): number {
  if (!existsSync(".env.local")) return 0;
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
  return parseo.lineasOmitidas;
}
