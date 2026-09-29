import { existsSync, readFileSync } from "node:fs";
import { informeEntorno, mensajeLineasOmitidas, parsearEnv, validarEntorno } from "../lib/config/entorno";

const RUTA = ".env.local";

function main(): number {
  console.log(`Revisión de ${RUTA}`);
  if (!existsSync(RUTA)) {
    console.error(`No está ${RUTA}.`);
    console.log(informeEntorno(validarEntorno({})));
    console.error("El entorno local no está listo.");
    return 1;
  }
  let texto: string;
  try {
    texto = readFileSync(RUTA, "utf8");
  } catch {
    console.error(`No se pudo leer ${RUTA}. No se muestra su contenido.`);
    return 1;
  }
  const parseo = parsearEnv(texto);
  if (parseo.lineasOmitidas > 0) console.error(mensajeLineasOmitidas(parseo.lineasOmitidas));
  const resultado = validarEntorno(parseo.valores);
  console.log(informeEntorno(resultado));
  if (resultado.errores.length > 0) {
    console.error("El entorno local no está listo.");
    return 1;
  }
  console.log("El entorno local tiene las variables obligatorias.");
  return 0;
}

process.exit(main());
