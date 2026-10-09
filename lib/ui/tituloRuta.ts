import type { Clave } from "@/lib/ui/diccionario";

export type ClaveTitulo = Extract<Clave, `titulos.${string}`>;

const EXACTAS: Record<string, ClaveTitulo> = {
  "/mis-tareas": "titulos.tasks",
  "/eventos": "titulos.events",
  "/eventos/nuevo": "titulos.newEvent",
  "/proyectos/nuevo": "titulos.newEvent",
  "/configuracion": "titulos.settings",
  "/cuentas": "titulos.settings",
  "/cuentas/preparar": "titulos.setupUsdc",
  "/informe": "titulos.report",
  "/join": "titulos.joinEvent",
  "/ayuda": "titulos.help",
};

/** Tab title key for an in-app route. The sign-in screen sets its own title. */
export function claveDeRuta(ruta: string): ClaveTitulo | null {
  const path = (ruta.split("?")[0] ?? "/").replace(/\/$/, "") || "/";
  const exacta = EXACTAS[path];
  if (exacta) return exacta;
  if (path.startsWith("/join/")) return "titulos.joinEvent";
  if (/^\/tareas\/[^/]+\/recibo$/.test(path)) return "titulos.receipt";
  if (/^\/tareas\/[^/]+$/.test(path)) return "titulos.task";
  if (/^\/revision\/[^/]+$/.test(path)) return "titulos.review";
  if (/^\/eventos\/[^/]+\/informe$/.test(path)) return "titulos.report";
  if (/^\/eventos\/[^/]+\/tareas$/.test(path)) return "titulos.assign";
  if (/^\/eventos\/[^/]+$/.test(path)) return "titulos.event";
  return null;
}

/** Same shape as the root metadata template (`%s · Hyto`). */
export function tituloDePestana(nombre: string): string {
  return `${nombre} · Hyto`;
}
