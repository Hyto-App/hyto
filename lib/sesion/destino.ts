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
