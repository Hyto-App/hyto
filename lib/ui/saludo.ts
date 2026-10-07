/** Local-time greeting. Costa Rica: morning until noon, afternoon until 7, then evening. */
export type Franja = "manana" | "tarde" | "noche";

export function franjaDe(fecha: Date): Franja {
  const hora = fecha.getHours();
  if (hora >= 5 && hora < 12) return "manana";
  if (hora >= 12 && hora < 19) return "tarde";
  return "noche";
}

/** First word of a display name. An email or an empty value is no name. */
export function primerNombre(nombre: string | null | undefined): string | null {
  const limpio = (nombre ?? "").trim();
  if (!limpio || limpio.includes("@")) return null;
  const primero = limpio.split(/\s+/)[0]?.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  return primero || null;
}

export function claveSaludo(franja: Franja, conNombre: boolean): `tareas.saludo.${Franja}` | `tareas.saludo.${Franja}Nombre` {
  return conNombre ? `tareas.saludo.${franja}Nombre` : `tareas.saludo.${franja}`;
}
