import type { Almacen } from "@/lib/db/almacen";
import type { Usuario } from "@/lib/db/tipos";
import { nombreEsInicioDeCorreo } from "./nombre";

/**
 * Old accounts stored the start of the email as the name. Clear that on the next sign-in.
 * A failed write does not block the session. A name that only contains @, such as "Ana @ Norte", stays.
 */
export async function olvidarNombreDeCorreo(almacen: Pick<Almacen, "vaciarNombre">, usuario: Usuario): Promise<Usuario> {
  if (!nombreEsInicioDeCorreo(usuario.nombre, usuario.email)) return usuario;
  try {
    await almacen.vaciarNombre(usuario.id);
  } catch (error) {
    console.warn("[api/sesion] Could not clear a stored name that matched the email.");
    console.warn(error instanceof Error ? error.name : "write failed");
    return usuario;
  }
  return { ...usuario, nombre: "" };
}
