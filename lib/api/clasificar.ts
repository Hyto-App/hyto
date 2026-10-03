import type { Almacen } from "@/lib/db/almacen";
import type { DificultadTarea, PrioridadTarea } from "@/lib/integrante/tipos";
import { esDificultad, esPrioridad } from "@/lib/tareas/clasificacion";
import { esOrganizador } from "./invitaciones";
import { json } from "./json";
import { tareaPublica } from "./tareas";

export async function clasificarTareaHttp(
  request: Request,
  almacen: Almacen,
  tareaId: string,
  usuarioId: string,
): Promise<Response> {
  const tarea = await almacen.leerTarea(tareaId);
  if (!tarea) return json({ aviso: "We couldn't find that task." }, 404);
  if (!(await esOrganizador(almacen, tarea.proyectoId, usuarioId))) {
    return json({ aviso: "Only the organizer can set priority and difficulty." }, 403);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "The body is not JSON." }, 400);
  }
  const leido = leerClasificacion(body);
  if ("aviso" in leido) return json({ aviso: leido.aviso }, 400);
  await almacen.actualizarTarea(tarea.id, leido);
  const guardada = await almacen.leerTarea(tarea.id);
  return json({ tarea: tareaPublica(guardada ?? { ...tarea, ...leido }) });
}

function leerClasificacion(body: unknown): { prioridad?: PrioridadTarea; dificultad?: DificultadTarea | null } | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "The body is not JSON." };
  const crudo = body as Record<string, unknown>;
  const cambio: { prioridad?: PrioridadTarea; dificultad?: DificultadTarea | null } = {};
  if ("prioridad" in crudo) {
    if (!esPrioridad(crudo.prioridad)) return { aviso: "Choose Normal or High." };
    cambio.prioridad = crudo.prioridad;
  }
  if ("dificultad" in crudo) {
    if (crudo.dificultad === null || crudo.dificultad === "") cambio.dificultad = null;
    else if (!esDificultad(crudo.dificultad)) return { aviso: "Choose Easy, Medium, Hard, or Not set." };
    else cambio.dificultad = crudo.dificultad;
  }
  if (!("prioridad" in cambio) && !("dificultad" in cambio)) return { aviso: "Nothing to save." };
  return cambio;
}
