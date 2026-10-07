export type DestinoVolver = { href: string; etiqueta: "volver" | "cancelar" };

/** Where the shell's Back goes by default, per route (spec §4). Routes not listed have no Back. */
export function destinoVolver(ruta: string): DestinoVolver | null {
  if (ruta === "/join" || ruta.startsWith("/join/")) return { href: "/mis-tareas", etiqueta: "volver" };
  if (ruta.startsWith("/tareas/")) return { href: "/mis-tareas", etiqueta: "volver" };
  if (ruta.startsWith("/revision/")) return { href: "/eventos", etiqueta: "volver" };
  if (ruta === "/eventos/nuevo") return { href: "/eventos", etiqueta: "cancelar" };
  if (ruta === "/cuentas/preparar") return { href: "/configuracion", etiqueta: "cancelar" };
  return null;
}
