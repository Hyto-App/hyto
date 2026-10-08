import { comunidadesActivas } from "@/lib/comunidades/bandera";
import type { Almacen } from "@/lib/db/almacen";
import type { AvisoComunidad, TareaFila, TipoAviso } from "@/lib/db/tipos";
import { tablonActivo } from "./bandera";

function encendido(): boolean {
  return tablonActivo() && comunidadesActivas();
}

export async function avisarTareasNuevas(
  almacen: Almacen,
  comunidadId: string | null | undefined,
  tareas: TareaFila[],
): Promise<void> {
  if (!encendido() || !comunidadId) return;
  try {
    for (const tarea of tareas) {
      if (tarea.miembroId) await guardar(almacen, comunidadId, "asignada", tarea, await nombreDe(almacen, tarea.miembroId));
      else await guardar(almacen, comunidadId, "disponible", tarea, null);
    }
  } catch (error) {
    console.error("[tablon] nuevas", error instanceof Error ? error.message : "error");
  }
}

export async function avisarAsignacion(almacen: Almacen, tareaId: string): Promise<void> {
  if (!encendido()) return;
  try {
    const tarea = await almacen.leerTarea(tareaId);
    if (!tarea) return;
    const proyecto = await almacen.leerProyecto(tarea.proyectoId);
    if (!proyecto?.comunidadId) return;
    if (!tarea.miembroId) {
      await guardar(almacen, proyecto.comunidadId, "disponible", tarea, null);
      return;
    }
    await guardar(almacen, proyecto.comunidadId, "asignada", tarea, await nombreDe(almacen, tarea.miembroId));
  } catch (error) {
    console.error("[tablon] asignacion", error instanceof Error ? error.message : "error");
  }
}

export async function avisarCompletada(almacen: Almacen, tareaId: string): Promise<void> {
  if (!encendido()) return;
  try {
    const tarea = await almacen.leerTarea(tareaId);
    if (!tarea || tarea.estado !== "pagado") return;
    const proyecto = await almacen.leerProyecto(tarea.proyectoId);
    if (!proyecto?.comunidadId) return;
    const previos = await almacen.listarAvisosComunidad(proyecto.comunidadId);
    if (previos.some((aviso) => aviso.tipo === "completada" && aviso.tareaId === tarea.id)) return;
    await guardar(almacen, proyecto.comunidadId, "completada", tarea, null);
  } catch (error) {
    console.error("[tablon] completada", error instanceof Error ? error.message : "error");
  }
}

async function guardar(
  almacen: Almacen,
  comunidadId: string,
  tipo: TipoAviso,
  tarea: TareaFila,
  nombre: string | null,
): Promise<void> {
  const aviso: AvisoComunidad = {
    id: crypto.randomUUID(),
    comunidadId,
    tipo,
    titulo: tarea.titulo.slice(0, 200),
    nombre: nombre ? nombre.slice(0, 80) : null,
    tareaId: tarea.id,
    creadoEn: new Date().toISOString(),
  };
  await almacen.crearAvisoComunidad(aviso);
}

async function nombreDe(almacen: Almacen, usuarioId: string): Promise<string> {
  const usuario = (await almacen.listarUsuarios()).find((item) => item.id === usuarioId);
  return usuario?.nombre.trim() || usuarioId;
}
