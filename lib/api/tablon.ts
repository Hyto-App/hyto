import { comunidadesActivas } from "@/lib/comunidades/bandera";
import type { Almacen } from "@/lib/db/almacen";
import type { AvisoComunidad } from "@/lib/db/tipos";
import { tablonActivo } from "@/lib/tablon/bandera";
import { avisarAsignacion } from "@/lib/tablon/publicar";
import { json } from "./json";

const NO = json({ aviso: "Not found." }, 404);

function apagado(): Response | null {
  return tablonActivo() && comunidadesActivas() ? null : NO;
}

export async function listarTablonHttp(almacen: Almacen, usuarioId: string, comunidadId: string): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const comunidad = await almacen.leerComunidad(comunidadId);
  if (!comunidad) return json({ aviso: "We couldn't find that community." }, 404);
  const miembro = await almacen.miembroComunidad(comunidadId, usuarioId);
  if (!miembro) return json({ aviso: "Join this community to read the bulletin." }, 403);
  const avisos = await almacen.listarAvisosComunidad(comunidadId);
  const tareas = await almacen.listarTareas();
  const proyectos = await almacen.listarProyectos();
  const deLaComunidad = new Set(proyectos.filter((proyecto) => proyecto.comunidadId === comunidadId).map((proyecto) => proyecto.id));
  const libres = new Set(
    tareas
      .filter((tarea) => deLaComunidad.has(tarea.proyectoId) && tarea.miembroId === "" && tarea.estado === "pendiente")
      .map((tarea) => tarea.id),
  );
  return json({
    avisos: avisos.map((aviso) => vista(aviso, aviso.tareaId ? libres.has(aviso.tareaId) : false)),
  });
}

export async function tomarTareaHttp(almacen: Almacen, usuarioId: string, tareaId: string): Promise<Response> {
  const cerrado = apagado();
  if (cerrado) return cerrado;
  const tarea = await almacen.leerTarea(tareaId);
  if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
  const proyecto = await almacen.leerProyecto(tarea.proyectoId);
  if (!proyecto?.comunidadId) return json({ aviso: "This task is not in a community." }, 409);
  const miembro = await almacen.miembroComunidad(proyecto.comunidadId, usuarioId);
  if (!miembro) return json({ aviso: "Join this community before taking a task." }, 403);
  if (tarea.estado !== "pendiente" || tarea.miembroId) return json({ aviso: "Someone already took this task." }, 409);
  const tomada = await almacen.tomarTarea(tarea.id, usuarioId);
  if (!tomada) return json({ aviso: "Someone already took this task." }, 409);
  await almacen.guardarMiembro({
    proyectoId: tarea.proyectoId,
    usuarioId,
    rol: "volunteer",
    estado: "active",
    creadoEn: new Date().toISOString(),
  });
  await avisarAsignacion(almacen, tarea.id);
  return json({ tareaId: tarea.id, miembroId: usuarioId });
}

function vista(aviso: AvisoComunidad, libre: boolean) {
  return {
    id: aviso.id,
    tipo: aviso.tipo,
    titulo: aviso.titulo,
    nombre: aviso.nombre,
    tareaId: aviso.tareaId,
    creadoEn: aviso.creadoEn,
    libre: aviso.tipo === "disponible" && libre,
  };
}
