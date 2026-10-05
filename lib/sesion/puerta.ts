import { notFound, redirect } from "next/navigation";
import { proyectosVisibles, puedeVerTarea, visorSesion, type Visor } from "@/lib/api/alcance";
import type { Almacen } from "@/lib/db/almacen";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila, TareaFila } from "@/lib/db/tipos";
import { sesionEsDemo } from "./demo";
import { urlSignin } from "./retorno";
import { leerSesionActual } from "./vista";

export async function exigirPagina(retorno?: string): Promise<SesionFila> {
  const sesion = await leerSesionActual();
  if (!sesion) redirect(urlSignin(retorno));
  return sesion;
}

export function visorDeSesion(sesion: SesionFila): Visor {
  if (sesionEsDemo(sesion)) return { usuarioId: sesion.usuarioId, demo: true };
  return visorSesion(sesion.usuarioId);
}

export async function exigirEvento(id: string): Promise<void> {
  const sesion = await exigirPagina();
  const almacen = await almacenNeon();
  if (!almacen) notFound();
  const visibles = await proyectosVisibles(almacen, visorDeSesion(sesion));
  if (!visibles.some((proyecto) => proyecto.id === id)) notFound();
}

export async function exigirTarea(id: string): Promise<TareaFila> {
  const sesion = await exigirPagina();
  const almacen = await almacenNeon();
  if (!almacen) notFound();
  const tarea = await almacen.leerTarea(id);
  if (!tarea) notFound();
  if (!(await puedeVerTarea(almacen, visorDeSesion(sesion), tarea))) notFound();
  return tarea;
}

export async function exigirOrganizadorDeTarea(id: string): Promise<TareaFila> {
  const sesion = await exigirPagina();
  const almacen = await almacenNeon();
  if (!almacen) notFound();
  const tarea = await almacen.leerTarea(id);
  if (!tarea) notFound();
  if (!(await organizaEvento(almacen, sesion.usuarioId, tarea.proyectoId))) notFound();
  return tarea;
}

export async function exigirOrganizadorEvento(id: string): Promise<void> {
  const sesion = await exigirPagina();
  const almacen = await almacenNeon();
  if (!almacen) notFound();
  if (!(await organizaEvento(almacen, sesion.usuarioId, id))) notFound();
}

async function organizaEvento(almacen: Almacen, usuarioId: string, proyectoId: string): Promise<boolean> {
  const miembros = await almacen.listarMiembros(proyectoId);
  return miembros.some((miembro) => miembro.usuarioId === usuarioId && miembro.rol === "organizer" && miembro.estado === "active");
}
