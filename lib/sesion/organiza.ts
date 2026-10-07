import { almacenNeon } from "@/lib/db/neon";

/** Project ids this person organizes. Empty when the database is down or they only belong as a member. */
export async function eventosOrganizados(usuarioId: string): Promise<string[]> {
  const id = usuarioId.trim();
  if (!id) return [];
  try {
    const almacen = await almacenNeon();
    if (!almacen) return [];
    const miembros = await almacen.miembrosDeUsuario(id);
    return miembros
      .filter((miembro) => miembro.estado === "active" && miembro.rol === "organizer")
      .map((miembro) => miembro.proyectoId);
  } catch {
    return [];
  }
}
