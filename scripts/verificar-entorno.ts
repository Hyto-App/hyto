import { existsSync, readFileSync } from "node:fs";
import {
  aplicarEnvLocal,
  informeEntorno,
  mensajeLineasOmitidas,
  parsearEnv,
  prepararBaseDe,
  validarEntorno,
} from "../lib/config/entorno";

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
  const entorno = { ...process.env };
  aplicarEnvLocal(parseo.valores, entorno);
  const preparada = prepararBaseDe(entorno);
  if (!preparada.ok) console.error(preparada.mensaje);
  else if (preparada.aviso) console.error(preparada.aviso);
  if (resultado.errores.length > 0 || parseo.lineasOmitidas > 0 || !preparada.ok) {
    console.error("El entorno local no está listo.");
    return 1;
  }
  console.log("El entorno local tiene las variables obligatorias.");
  return 0;
}

process.exit(main());
