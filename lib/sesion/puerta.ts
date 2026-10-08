import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { organizaTareaAjena, proyectosVisibles, puedeVerTarea, visorSesion, type Visor } from "@/lib/api/alcance";
import type { Almacen } from "@/lib/db/almacen";
import { almacenNeon } from "@/lib/db/neon";
import type { SesionFila, TareaFila } from "@/lib/db/tipos";
import { faltaTipoCuenta } from "@/lib/api/tipo-cuenta";
import { tipoCuentaActivo } from "@/lib/cuenta/bandera";
import { sesionEsDemo } from "./demo";
import { rutaElegirTipo, urlSignin } from "./retorno";
import { leerSesionActual } from "./vista";

/** A prefetch often arrives without the session cookie. Redirecting it would send the person to sign-in. */
export async function esPrefetch(): Promise<boolean> {
  const pedido = await headers();
  const marcas = [
    pedido.get("next-router-prefetch"),
    pedido.get("next-router-segment-prefetch"),
    pedido.get("purpose"),
    pedido.get("sec-purpose"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return marcas.split(/\s+/).some((marca) => marca === "1" || marca.includes("prefetch"));
}

export async function exigirPagina(retorno?: string, opciones?: { omitirTipo?: boolean }): Promise<SesionFila> {
  const sesion = await leerSesionActual();
  if (!sesion) {
    if (await esPrefetch()) notFound();
    redirect(urlSignin(retorno));
  }
  if (!opciones?.omitirTipo && tipoCuentaActivo() && !sesionEsDemo(sesion)) {
    const almacen = await almacenNeon();
    if (almacen && (await faltaTipoCuenta(almacen, sesion.usuarioId))) redirect(rutaElegirTipo(retorno));
  }
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

/** Gate for the payee pages under `/tareas/[id]`. An organizer who is not the assignee goes to the review. */
export async function exigirTarea(id: string): Promise<TareaFila> {
  const sesion = await exigirPagina();
  const almacen = await almacenNeon();
  if (!almacen) notFound();
  const tarea = await almacen.leerTarea(id);
  if (!tarea) notFound();
  if (!(await puedeVerTarea(almacen, visorDeSesion(sesion), tarea))) notFound();
  if (await organizaTareaAjena(almacen, sesion.usuarioId, tarea)) redirect(`/revision/${encodeURIComponent(tarea.id)}`);
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
