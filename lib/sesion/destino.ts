import type { SesionFila } from "@/lib/db/tipos";
import { sesionEsDemo } from "./demo";

/**
 * Home after sign-in. Organizer navigation already lives in the shell.
 * This only chooses the first page: events for someone who organizes, including the demo organizer.
 */
export function destinoInicio(
  sesion: Pick<SesionFila, "email" | "usuarioId" | "rol">,
  organiza: boolean,
): "/eventos" | "/mis-tareas" {
  if (organiza) return "/eventos";
  if (sesionEsDemo(sesion) && sesion.rol === "organizador") return "/eventos";
  return "/mis-tareas";
}

/** A new account opens Events, where Create event lives, even before it organizes one. */
export function destinoDeInicio(
  sesion: Pick<SesionFila, "email" | "usuarioId" | "rol">,
  organiza: boolean,
  alta: boolean,
): "/eventos" | "/mis-tareas" {
  if (alta) return "/eventos";
  return destinoInicio(sesion, organiza);
}
