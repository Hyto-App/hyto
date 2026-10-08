import type { Almacen } from "@/lib/db/almacen";
import { esProyectoDemo } from "@/lib/db/semilla";
import type { EvidenciaFila, Proyecto, RolEvento, TareaFila } from "@/lib/db/tipos";
import { demoHabilitado, sesionEsDemo } from "@/lib/sesion/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

export type Visor = {
  usuarioId: string | null;
  demo: boolean;
  /** This sign-in's account. Never set for a demo session. */
  wallet?: string;
};

export async function visorDe(request: Request): Promise<Visor | Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) {
    if (sesion.status === 401 && demoHabilitado()) return { usuarioId: null, demo: true };
    return sesion;
  }
  if (demoHabilitado() && sesionEsDemo(sesion)) return { usuarioId: sesion.usuarioId, demo: true };
  if (sesionEsDemo(sesion)) return { usuarioId: sesion.usuarioId, demo: false };
  return { usuarioId: sesion.usuarioId, demo: false, wallet: sesion.wallet };
}

export function visorSesion(usuarioId: string): Visor {
  return { usuarioId, demo: false };
}

export async function tareasVisibles(almacen: Almacen, visor: Visor): Promise<TareaFila[]> {
  const todas = await almacen.listarTareas();
  if (visor.demo && !visor.usuarioId) {
    const permitidos = await idsDemo(almacen);
    return todas.filter((tarea) => permitidos.has(tarea.proyectoId));
  }
  if (!visor.usuarioId) return [];
  const propias = await tareasDeUsuario(almacen, visor.usuarioId, todas);
  if (!visor.demo) return propias;
  const permitidos = await idsDemo(almacen);
  return propias.filter((tarea) => permitidos.has(tarea.proyectoId));
}

export async function tareasPropias(almacen: Almacen, visor: Visor): Promise<TareaFila[]> {
  const visibles = await tareasVisibles(almacen, visor);
  if (!visor.usuarioId) return visibles;
  return visibles.filter((tarea) => tarea.miembroId === visor.usuarioId);
}

async function idsDemo(almacen: Almacen): Promise<Set<string>> {
  return new Set((await almacen.listarProyectos()).filter((proyecto) => esProyectoDemo(proyecto)).map((proyecto) => proyecto.id));
}

async function rolesDeUsuario(almacen: Almacen, usuarioId: string): Promise<Map<string, RolEvento>> {
  const miembros = await almacen.miembrosDeUsuario(usuarioId);
  const roles = new Map<string, RolEvento>();
  for (const miembro of miembros) {
    if (miembro.estado === "active") roles.set(miembro.proyectoId, miembro.rol);
  }
  return roles;
}

async function idsConMembresia(almacen: Almacen, usuarioId: string): Promise<Set<string>> {
  return new Set((await rolesDeUsuario(almacen, usuarioId)).keys());
}

export async function proyectosVisibles(almacen: Almacen, visor: Visor): Promise<Proyecto[]> {
  if (visor.demo) return (await almacen.listarProyectos()).filter((proyecto) => esProyectoDemo(proyecto)).sort(porCreacion);
  const tareas = await tareasVisibles(almacen, visor);
  const ids = new Set(tareas.map((tarea) => tarea.proyectoId));
  if (visor.usuarioId) {
    for (const id of await idsConMembresia(almacen, visor.usuarioId)) ids.add(id);
  }
  const proyectos = await almacen.listarProyectos();
  return proyectos.filter((proyecto) => ids.has(proyecto.id)).sort(porCreacion);
}

export async function puedeVerTarea(almacen: Almacen, visor: Visor, tarea: TareaFila): Promise<boolean> {
  const proyecto = await almacen.leerProyecto(tarea.proyectoId);
  if (visor.demo && !visor.usuarioId) return esProyectoDemo(proyecto);
  if (!visor.usuarioId) return false;
  if (visor.demo && !esProyectoDemo(proyecto)) return false;
  if (!proyecto) return tarea.miembroId === visor.usuarioId;
  const rol = (await rolesDeUsuario(almacen, visor.usuarioId)).get(proyecto.id);
  if (rol === "organizer") return true;
  return tarea.miembroId === visor.usuarioId;
}

/**
 * `/tareas/[id]` only loads tasks assigned to the session (`tareasPropias`).
 * The event's organizer opening someone else's task belongs on `/revision/[id]`.
 */
export async function organizaTareaAjena(almacen: Almacen, usuarioId: string, tarea: TareaFila): Promise<boolean> {
  if (tarea.miembroId === usuarioId) return false;
  return (await rolesDeUsuario(almacen, usuarioId)).get(tarea.proyectoId) === "organizer";
}

export async function accesoEvidencia(
  almacen: Almacen,
  visor: Visor,
  evidencia: EvidenciaFila | null,
): Promise<"si" | "no" | "ausente" | "entrar"> {
  if (!evidencia) return "ausente";
  const tarea = await almacen.leerTarea(evidencia.tareaId);
  if (!tarea) return "ausente";
  if (await puedeVerTarea(almacen, visor, tarea)) return "si";
  if (!visor.usuarioId) return "entrar";
  return "no";
}

async function tareasDeUsuario(almacen: Almacen, usuarioId: string, todas: TareaFila[]): Promise<TareaFila[]> {
  const roles = await rolesDeUsuario(almacen, usuarioId);
  return todas.filter((tarea) => {
    if (roles.get(tarea.proyectoId) === "organizer") return true;
    return tarea.miembroId === usuarioId;
  });
}

function porCreacion(a: Proyecto, b: Proyecto): number {
  return a.creadoEn < b.creadoEn ? 1 : a.creadoEn > b.creadoEn ? -1 : 0;
}
