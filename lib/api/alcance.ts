import type { Almacen } from "@/lib/db/almacen";
import { esProyectoDemo } from "@/lib/db/semilla";
import type { EvidenciaFila, Proyecto, TareaFila } from "@/lib/db/tipos";
import { demoHabilitado, sesionEsDemo } from "@/lib/sesion/demo";
import { exigirSesion } from "@/lib/sesion/exigir";

export type Visor = {
  usuarioId: string | null;
  demo: boolean;
};

export async function visorDe(request: Request): Promise<Visor | Response> {
  const sesion = await exigirSesion(request);
  if (sesion instanceof Response) {
    if (sesion.status === 401 && demoHabilitado()) return { usuarioId: null, demo: true };
    return sesion;
  }
  if (demoHabilitado() && sesionEsDemo(sesion)) return { usuarioId: sesion.usuarioId, demo: true };
  return { usuarioId: sesion.usuarioId, demo: false };
}

export function visorSesion(usuarioId: string): Visor {
  return { usuarioId, demo: false };
}

export async function tareasVisibles(almacen: Almacen, visor: Visor): Promise<TareaFila[]> {
  const todas = await almacen.listarTareas();
  if (visor.demo) {
    const permitidos = new Set(
      (await almacen.listarProyectos()).filter((proyecto) => esProyectoDemo(proyecto)).map((proyecto) => proyecto.id),
    );
    return todas.filter((tarea) => permitidos.has(tarea.proyectoId));
  }
  if (!visor.usuarioId) return [];
  return tareasDeUsuario(almacen, visor.usuarioId, todas);
}

export async function proyectosVisibles(almacen: Almacen, visor: Visor): Promise<Proyecto[]> {
  if (visor.demo) return (await almacen.listarProyectos()).filter((proyecto) => esProyectoDemo(proyecto)).sort(porCreacion);
  const tareas = await tareasVisibles(almacen, visor);
  const ids = new Set(tareas.map((tarea) => tarea.proyectoId));
  if (visor.usuarioId) {
    for (const proyecto of await almacen.listarProyectos()) {
      if (proyecto.organizadorId === visor.usuarioId) ids.add(proyecto.id);
    }
  }
  const proyectos = await almacen.listarProyectos();
  return proyectos.filter((proyecto) => ids.has(proyecto.id)).sort(porCreacion);
}

export async function puedeVerTarea(almacen: Almacen, visor: Visor, tarea: TareaFila): Promise<boolean> {
  const proyecto = await almacen.leerProyecto(tarea.proyectoId);
  if (visor.demo) return esProyectoDemo(proyecto);
  if (!visor.usuarioId) return false;
  if (tarea.miembroId === visor.usuarioId) return true;
  return Boolean(proyecto?.organizadorId && proyecto.organizadorId === visor.usuarioId);
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
  const organiza = new Set(
    (await almacen.listarProyectos()).filter((proyecto) => proyecto.organizadorId === usuarioId).map((proyecto) => proyecto.id),
  );
  return todas.filter((tarea) => organiza.has(tarea.proyectoId) || tarea.miembroId === usuarioId);
}

function porCreacion(a: Proyecto, b: Proyecto): number {
  return a.creadoEn < b.creadoEn ? 1 : a.creadoEn > b.creadoEn ? -1 : 0;
}
