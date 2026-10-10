import type { Clave } from "@/lib/ui/diccionario";

export type SeccionBarra = "eventos" | "tareas" | "comunidades";
export type EnlaceBarra = { seccion: SeccionBarra; href: string; clave: Clave; icono: "calendar" | "tasks" | "projects" };

/** The two main entries, in this order. Inbox, report, and event tasks live as tabs inside the event, and joining with a code lives on `/eventos`. */
export const ENLACES_BARRA: readonly EnlaceBarra[] = [
  { seccion: "eventos", href: "/eventos", clave: "nav.events", icono: "calendar" },
  { seccion: "tareas", href: "/mis-tareas", clave: "nav.myTasks", icono: "tasks" },
];

const COMUNIDADES: EnlaceBarra = { seccion: "comunidades", href: "/comunidades", clave: "nav.communities", icono: "projects" };

/** Desktop and mobile share this list. Communities is appended only when its flag is on. */
export function enlacesBarra(mostrarComunidades: boolean): readonly EnlaceBarra[] {
  return mostrarComunidades ? [...ENLACES_BARRA, COMUNIDADES] : ENLACES_BARRA;
}

/** Whether this session can organize: it already organizes an event, or it is the demo organizer. Gates the organizer actions, such as creating an event. */
export function muestraNavOrganizador(organizados: readonly string[], demoOrganizador: boolean): boolean {
  return demoOrganizador || organizados.length > 0;
}
