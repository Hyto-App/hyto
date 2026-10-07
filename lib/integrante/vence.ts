import type { Idioma } from "@/lib/ui/idioma";

/** "today, 4:00 PM" / "Fri, 4:00 PM". The caller adds "Due" from the dictionary. Returns null if the date is not valid. */
export function cuandoVence(iso: string, ahora: Date, idioma: Idioma, zona = "America/Costa_Rica"): string | null {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  const local = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const lengua = idioma === "es" ? "es-CR" : "en-US";
  const hora = new Intl.DateTimeFormat(lengua, { timeZone: zona, hour: "numeric", minute: "2-digit" }).format(fecha);
  if (local(fecha) === local(ahora)) return `${idioma === "es" ? "hoy" : "today"}, ${hora}`;
  const dia = new Intl.DateTimeFormat(lengua, { timeZone: zona, weekday: "short", day: "numeric", month: "short" }).format(fecha);
  return `${dia}, ${hora}`;
}
