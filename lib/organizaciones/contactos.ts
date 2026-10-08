import type { Almacen } from "@/lib/db/almacen";
import type { OrganizacionVoluntario, Proyecto } from "@/lib/db/tipos";
import { enmascararCorreo } from "@/lib/ui/correo";
import { organizacionesActivas } from "./bandera";

/** True when the user is an admin of that organization. Always false with the flag off. */
export async function esAdminDeOrganizacion(almacen: Almacen, organizacionId: string, usuarioId: string): Promise<boolean> {
  if (!organizacionesActivas()) return false;
  const admins = await almacen.listarAdmins(organizacionId);
  return admins.some((admin) => admin.usuarioId === usuarioId);
}

/**
 * Whether this viewer may read other people's emails in an event. Events without an
 * organization, and a flag that is off, keep today's behavior. In an organization's event
 * only that organization's admins see the full email.
 */
export async function veCorreosDelEvento(almacen: Almacen, proyecto: Pick<Proyecto, "organizacionId">, usuarioId: string): Promise<boolean> {
  if (!organizacionesActivas() || !proyecto.organizacionId) return true;
  return esAdminDeOrganizacion(almacen, proyecto.organizacionId, usuarioId);
}

export function correoSegun(correo: string, puedeVer: boolean): string {
  return puedeVer ? correo : enmascararCorreo(correo);
}

function nuevoContacto(
  organizacionId: string,
  email: string,
  origen: OrganizacionVoluntario["origen"],
  ahora: string,
): OrganizacionVoluntario {
  return {
    organizacionId,
    email,
    usuarioId: null,
    nombre: null,
    etiquetas: [],
    origen,
    participaciones: 0,
    ultimaParticipacion: null,
    creadoEn: ahora,
  };
}

/**
 * Someone became a member of an event. When that event belongs to an organization, the person
 * is saved as a contact (origin "evento" if new) and the count goes up by one.
 * `yaEraMiembro` is read by the caller before the membership row exists: the count rises only
 * the first time a person joins each event.
 */
export async function registrarParticipacion(
  almacen: Almacen,
  proyectoId: string,
  usuarioId: string,
  yaEraMiembro: boolean,
): Promise<void> {
  if (!organizacionesActivas() || yaEraMiembro) return;
  try {
    const proyecto = await almacen.leerProyecto(proyectoId);
    if (!proyecto?.organizacionId || proyecto.organizadorId === usuarioId) return;
    const usuario = await almacen.leerUsuario(usuarioId);
    const email = usuario?.email.trim().toLowerCase();
    if (!usuario || !email) return;
    const ahora = new Date().toISOString();
    const previo = (await almacen.leerVoluntario(proyecto.organizacionId, email)) ?? nuevoContacto(proyecto.organizacionId, email, "evento", ahora);
    await almacen.guardarVoluntario({
      ...previo,
      usuarioId: usuario.id,
      nombre: usuario.nombre.trim() || previo.nombre,
      participaciones: previo.participaciones + 1,
      ultimaParticipacion: ahora,
    });
  } catch (error) {
    // Saving a contact never blocks joining an event.
    console.error("[organizaciones] participacion", error instanceof Error ? error.message : "error");
  }
}

/** A direct invite from an event that belongs to an organization saves the email as a contact. */
export async function registrarInvitado(almacen: Almacen, proyectoId: string, email: string): Promise<void> {
  if (!organizacionesActivas()) return;
  try {
    const proyecto = await almacen.leerProyecto(proyectoId);
    if (!proyecto?.organizacionId) return;
    const correo = email.trim().toLowerCase();
    if (await almacen.leerVoluntario(proyecto.organizacionId, correo)) return;
    const usuario = await almacen.usuarioPorEmail(correo);
    await almacen.guardarVoluntario({
      ...nuevoContacto(proyecto.organizacionId, correo, "invitacion", new Date().toISOString()),
      usuarioId: usuario?.id ?? null,
      nombre: usuario?.nombre.trim() || null,
    });
  } catch (error) {
    console.error("[organizaciones] invitado", error instanceof Error ? error.message : "error");
  }
}
