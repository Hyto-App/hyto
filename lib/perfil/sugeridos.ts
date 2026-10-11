import type { Proyecto, ProyectoMiembro, TareaFila, Usuario } from "@/lib/db/tipos";
import { iniciales } from "@/lib/perfil/iniciales";
import { nombreVisible } from "@/lib/sesion/nombre";
import { tareaCuenta } from "./cifras";
import { esEventoDePrueba } from "./prueba";

/**
 * People to suggest when an organizer assigns a task or invites someone.
 * Only people from this organizer's own events: never contacts of other organizers.
 * The email goes along because the viewer organizes an event the person is in.
 */
export type Sugerido = {
  usuarioId: string;
  /** Chosen name, or null when the person has not set one. */
  nombre: string | null;
  iniciales: string;
  email: string;
  /** Other events of this organizer the person was in (the current one is not counted). */
  eventosEnComun: number;
  /** Paid tasks in this organizer's events that count (same rules as the profile). */
  tareasHechas: number;
  /** Active member of the event being edited: can be assigned right away. */
  enEsteEvento: boolean;
  /** Was in at least one other event of this organizer. */
  yaTrabajo: boolean;
};

export type EntradaSugeridos = {
  organizadorId: string;
  proyectoId: string;
  proyectos: readonly Proyecto[];
  /** Membership rows of every event this organizer runs. */
  miembros: readonly ProyectoMiembro[];
  tareas: readonly TareaFila[];
  usuarios: readonly Usuario[];
};

export function calcularSugeridos(entrada: EntradaSugeridos): Sugerido[] {
  const { organizadorId, proyectoId } = entrada;
  const porId = new Map(entrada.proyectos.map((proyecto) => [proyecto.id, proyecto]));
  const organiza = new Set(
    entrada.miembros
      .filter((miembro) => miembro.usuarioId === organizadorId && miembro.rol === "organizer" && miembro.estado === "active")
      .map((miembro) => miembro.proyectoId),
  );
  for (const proyecto of entrada.proyectos) if (proyecto.organizadorId === organizadorId) organiza.add(proyecto.id);
  if (!organiza.has(proyectoId)) return [];

  const pasados = new Set([...organiza].filter((id) => id !== proyectoId && !esEventoDePrueba(porId.get(id))));
  const comun = new Map<string, Set<string>>();
  const aqui = new Set<string>();
  for (const miembro of entrada.miembros) {
    if (miembro.usuarioId === organizadorId || miembro.estado !== "active") continue;
    if (miembro.proyectoId === proyectoId) aqui.add(miembro.usuarioId);
    else if (pasados.has(miembro.proyectoId)) {
      const lista = comun.get(miembro.usuarioId) ?? new Set<string>();
      lista.add(miembro.proyectoId);
      comun.set(miembro.usuarioId, lista);
    }
  }

  const tareasPorPersona = new Map<string, number>();
  for (const tarea of entrada.tareas) {
    if (!organiza.has(tarea.proyectoId) || !tarea.miembroId) continue;
    if (!tareaCuenta(tarea, porId.get(tarea.proyectoId), entrada.miembros)) continue;
    tareasPorPersona.set(tarea.miembroId, (tareasPorPersona.get(tarea.miembroId) ?? 0) + 1);
  }

  const usuarios = new Map(entrada.usuarios.map((usuario) => [usuario.id, usuario]));
  const ids = new Set([...comun.keys(), ...aqui]);
  const lista: Sugerido[] = [];
  for (const id of ids) {
    const usuario = usuarios.get(id);
    if (!usuario) continue;
    const nombre = nombreVisible(usuario.nombre, usuario.email);
    lista.push({
      usuarioId: id,
      nombre,
      iniciales: iniciales(nombre ?? "", usuario.email),
      email: usuario.email,
      eventosEnComun: comun.get(id)?.size ?? 0,
      tareasHechas: tareasPorPersona.get(id) ?? 0,
      enEsteEvento: aqui.has(id),
      yaTrabajo: comun.has(id),
    });
  }
  return lista.sort(
    (a, b) =>
      Number(b.yaTrabajo) - Number(a.yaTrabajo) ||
      b.eventosEnComun - a.eventosEnComun ||
      b.tareasHechas - a.tareasHechas ||
      (a.nombre ?? a.email).localeCompare(b.nombre ?? b.email),
  );
}
