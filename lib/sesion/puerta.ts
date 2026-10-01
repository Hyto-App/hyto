import { notFound, redirect } from "next/navigation";
import { proyectosVisibles, puedeVerTarea, visorSesion, type Visor } from "@/lib/api/alcance";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila, TareaFila } from "@/lib/db/tipos";
import { sesionEsDemo } from "./demo";
import { leerSesionActual } from "./vista";

export async function exigirPagina(): Promise<SesionFila> {
  const sesion = await leerSesionActual();
  if (!sesion) redirect("/?signin=1");
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
