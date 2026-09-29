import { neon } from "@neondatabase/serverless";
import { correrComparacion } from "../../lib/db/correr-comparacion";
import { consultarLoteReadOnly, ocultarUrl } from "../../lib/db/diff-esquema";

correrComparacion({
  databaseUrl: process.env.DATABASE_URL,
  directorioMigraciones: "drizzle",
  raiz: process.cwd(),
  consultar: (consultas) => {
    const url = process.env.DATABASE_URL?.trim() ?? "";
    const sql = neon(url);
    return consultarLoteReadOnly(sql, consultas);
  },
})
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((error: unknown) => {
    const texto = error instanceof Error ? error.message : "No se pudo comparar el esquema.";
    console.error(ocultarUrl(texto));
    process.exitCode = 1;
  });
