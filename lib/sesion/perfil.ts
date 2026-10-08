import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila } from "@/lib/db/tipos";
import { nombreVisible } from "./nombre";

export type Perfil = { nombre: string | null; email: string };

export { nombreVisible };

export async function leerPerfil(sesion: SesionFila): Promise<Perfil> {
  try {
    const almacen = await almacenNeon();
    const usuario = almacen ? await almacen.usuarioPorEmail(sesion.email) : null;
    return { nombre: nombreVisible(usuario?.nombre, sesion.email), email: sesion.email };
  } catch {
    return { nombre: null, email: sesion.email };
  }
}
