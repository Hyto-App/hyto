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
export function nombreParaMostrar(nombre: string | null | undefined, evento: string | null | undefined): string | null {
  return nombreOrganizadorVisible(nombre, "", evento);
}
