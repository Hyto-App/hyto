import { join } from "node:path";
import { construirCruce, lineasCruce, pendientesConEsteban } from "./cruce-codigo";
import {
  compararEsquema,
  exigirDatabaseUrl,
  lecturaDesdeLote,
  observadoDesdeFilas,
  ocultarUrl,
  ORDEN_CONSULTAS,
  type Diferencia,
} from "./diff-esquema";
import { leerMigraciones } from "./esquema-migracion";

export type SalidaComparacion = {
  log: (linea: string) => void;
  error: (linea: string) => void;
};

export type OpcionesComparacion = {
  databaseUrl: string | undefined;
  directorioMigraciones: string;
  raiz: string;
  consultar: (consultas: readonly string[]) => Promise<unknown[]>;
  salida?: SalidaComparacion;
};

export async function correrComparacion(opciones: OpcionesComparacion): Promise<number> {
  const salida = opciones.salida ?? { log: (linea) => console.log(linea), error: (linea) => console.error(linea) };
  const exigido = exigirDatabaseUrl(opciones.databaseUrl);
  if (!exigido.ok) {
    salida.error(exigido.mensaje);
    return 1;
  }

  salida.log("Solo lectura. No se escribe en la base.");
  salida.log("Las consultas van en una transacción READ ONLY.");
  salida.log("Usar DATABASE_URL de una copia o una rama. Nunca la de producción.");
  salida.log("");

  const esperado = leerMigraciones(opciones.directorioMigraciones);
  const cruce = construirCruce(opciones.raiz, esperado);
  if (esperado.archivos.length === 0) {
    salida.log("No se leyó ninguna migración.");
  } else {
    salida.log(`Migraciones leídas: ${esperado.archivos.map((archivo) => join("drizzle", archivo)).join(", ")}.`);
  }
  salida.log("");
  for (const linea of lineasCruce(cruce)) salida.log(linea);
  salida.log("");
  salida.log("Para confirmar con Esteban");
  const pendientes = pendientesConEsteban(esperado, cruce);
  if (pendientes.length === 0) salida.log("No quedó nada marcado.");
  for (const pendiente of pendientes) salida.log(`- ${pendiente.texto}`);
  for (const aviso of esperado.avisos) salida.log(`- ${aviso}`);
  salida.log("");
  salida.log("Comparación con information_schema (tablas base del esquema public)");

  let lote: unknown[];
  try {
    lote = await opciones.consultar(ORDEN_CONSULTAS);
  } catch (error: unknown) {
    const texto = error instanceof Error ? error.message : "No se pudo leer la base.";
    salida.error(ocultarUrl(texto));
    return 1;
  }

  let diferencias: Diferencia[];
  try {
    diferencias = compararEsquema(esperado, observadoDesdeFilas(lecturaDesdeLote(lote)));
  } catch (error: unknown) {
    const texto = error instanceof Error ? error.message : "No se pudo interpretar la lectura.";
    salida.error(ocultarUrl(texto));
    return 1;
  }
  if (diferencias.length === 0) salida.log("Sin diferencias entre la base y las migraciones.");
  for (const diferencia of diferencias) salida.log(`- ${diferencia.mensaje}`);

  if (esperado.avisos.length > 0 || diferencias.length > 0) return 2;
  return 0;
}
