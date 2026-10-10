import type { Idioma } from "@/lib/ui/idioma";

/**
 * The demo users are stored with English names (`lib/sesion/demo.ts`), and the sample tasks name
 * their organizer "Organizer" (`lib/integrante/ejemplos.ts`). The screens show them in the session
 * language. Stored data does not change.
 */
const NOMBRES_DEMO: Record<string, Record<Idioma, string>> = {
  organizer: { en: "Organizer", es: "Organizador" },
  organizador: { en: "Organizer", es: "Organizador" },
  "organizer (demo)": { en: "Organizer (demo)", es: "Organizador (demo)" },
  "organizador (demo)": { en: "Organizer (demo)", es: "Organizador (demo)" },
  "volunteer (demo)": { en: "Volunteer (demo)", es: "Voluntario (demo)" },
  "voluntario (demo)": { en: "Volunteer (demo)", es: "Voluntario (demo)" },
};

/** A demo user's name in the screen language. Any other name comes back unchanged. */
export function nombreEnIdioma(nombre: string, idioma: Idioma): string {
  return NOMBRES_DEMO[nombre.trim().toLowerCase()]?.[idioma] ?? nombre;
}

/**
 * A stored name the screens may show. Empty, the whole email, or the part before @ is not a name.
 * The screens then use another label. They never show a piece of the email as a name.
 */
export function nombreVisible(nombre: string | null | undefined, email: string): string | null {
  const limpio = (nombre ?? "").trim();
  if (!limpio || limpio.includes("@")) return null;
  const correo = email.trim().toLowerCase();
  if (correo && limpio.toLowerCase() === correo) return null;
  const corte = correo.indexOf("@");
  const local = corte > 0 ? correo.slice(0, corte) : "";
  if (local && limpio.toLowerCase() === local) return null;
  return limpio;
}

/** Name the payee can read. A real name wins. The event name is the backup. Null when neither is a name. */
export function nombreOrganizadorVisible(
  nombre: string | null | undefined,
  email: string | null | undefined,
  evento: string | null | undefined,
): string | null {
  const persona = nombreVisible(nombre, email ?? "");
  if (persona) return persona.slice(0, 80);
  const delEvento = nombreVisible(evento, "");
  return delEvento ? delEvento.slice(0, 80) : null;
}

/**
 * What the payee screens render. Drops anything that still looks like an email.
 * When the person has no name, the event name fills the same place.
 */
export function nombreParaMostrar(
  nombre: string | null | undefined,
  evento: string | null | undefined,
  idioma: Idioma = "en",
): string | null {
  const visible = nombreOrganizadorVisible(nombre, "", evento);
  return visible ? nombreEnIdioma(visible, idioma) : null;
}
