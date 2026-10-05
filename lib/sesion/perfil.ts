import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila } from "@/lib/db/tipos";

export type Perfil = { nombre: string | null; email: string };

/** A name that is empty or the same as the email is no name: the screens then show the email alone. */
export function nombreVisible(nombre: string | null | undefined, email: string): string | null {
  const limpio = (nombre ?? "").trim();
  if (!limpio || limpio.toLowerCase() === email.trim().toLowerCase()) return null;
  return limpio;
}

export async function leerPerfil(sesion: SesionFila): Promise<Perfil> {
  try {
    const almacen = await almacenNeon();
    const usuario = almacen ? await almacen.usuarioPorEmail(sesion.email) : null;
    return { nombre: nombreVisible(usuario?.nombre, sesion.email), email: sesion.email };
  } catch {
    return { nombre: null, email: sesion.email };
  }
}
