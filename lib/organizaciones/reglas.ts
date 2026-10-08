import type { OrganizacionVoluntario } from "@/lib/db/tipos";

export const MAX_NOMBRE = 80;
export const MAX_DESCRIPCION = 1000;
export const MAX_ETIQUETAS = 10;
export const MAX_ETIQUETA = 30;
export const MAX_NOMBRE_CONTACTO = 80;
export const MAX_SUGERIDOS = 8;

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarCorreo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const correo = valor.trim().toLowerCase();
  return CORREO.test(correo) ? correo : null;
}

/** Free tags: trimmed, no repeats (ignoring case), at most MAX_ETIQUETAS of MAX_ETIQUETA characters. */
export function leerEtiquetas(valor: unknown): { etiquetas: string[] } | { aviso: string } {
  if (valor === undefined || valor === null) return { etiquetas: [] };
  if (!Array.isArray(valor)) return { aviso: "Tags have to be a list of words." };
  const vistas = new Set<string>();
  const etiquetas: string[] = [];
  for (const item of valor) {
    if (typeof item !== "string") return { aviso: "Tags have to be a list of words." };
    const limpia = item.trim().replace(/\s+/g, " ");
    if (!limpia) continue;
    if (limpia.length > MAX_ETIQUETA) return { aviso: `A tag can have up to ${MAX_ETIQUETA} characters.` };
    const clave = limpia.toLowerCase();
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    etiquetas.push(limpia);
  }
  if (etiquetas.length > MAX_ETIQUETAS) return { aviso: `Use up to ${MAX_ETIQUETAS} tags.` };
  return { etiquetas };
}

export type AltaOrganizacion = { nombre: string; descripcion: string; etiquetas: string[] };

export function leerAltaOrganizacion(body: unknown): AltaOrganizacion | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Enter an organization name." };
  const crudo = body as Record<string, unknown>;
  const nombre = typeof crudo.nombre === "string" ? crudo.nombre.trim() : "";
  if (!nombre) return { aviso: "Enter an organization name." };
  if (nombre.length > MAX_NOMBRE) return { aviso: `The name can have up to ${MAX_NOMBRE} characters.` };
  const descripcion = typeof crudo.descripcion === "string" ? crudo.descripcion.trim() : "";
  if (descripcion.length > MAX_DESCRIPCION) {
    return { aviso: `The description can have up to ${MAX_DESCRIPCION} characters.` };
  }
  const etiquetas = leerEtiquetas(crudo.etiquetas);
  if ("aviso" in etiquetas) return etiquetas;
  return { nombre, descripcion, etiquetas: etiquetas.etiquetas };
}

/** Only the fields that came in. An empty change is an error. */
export function leerCambioOrganizacion(
  body: unknown,
): Partial<AltaOrganizacion> | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Nothing to change." };
  const crudo = body as Record<string, unknown>;
  const cambio: Partial<AltaOrganizacion> = {};
  if ("nombre" in crudo) {
    const nombre = typeof crudo.nombre === "string" ? crudo.nombre.trim() : "";
    if (!nombre) return { aviso: "Enter an organization name." };
    if (nombre.length > MAX_NOMBRE) return { aviso: `The name can have up to ${MAX_NOMBRE} characters.` };
    cambio.nombre = nombre;
  }
  if ("descripcion" in crudo) {
    const descripcion = typeof crudo.descripcion === "string" ? crudo.descripcion.trim() : "";
    if (descripcion.length > MAX_DESCRIPCION) {
      return { aviso: `The description can have up to ${MAX_DESCRIPCION} characters.` };
    }
    cambio.descripcion = descripcion;
  }
  if ("etiquetas" in crudo) {
    const etiquetas = leerEtiquetas(crudo.etiquetas);
    if ("aviso" in etiquetas) return etiquetas;
    cambio.etiquetas = etiquetas.etiquetas;
  }
  if (Object.keys(cambio).length === 0) return { aviso: "Nothing to change." };
  return cambio;
}

export function leerNombreContacto(valor: unknown): { nombre: string | null } | { aviso: string } {
  if (valor === undefined || valor === null) return { nombre: null };
  if (typeof valor !== "string") return { aviso: "The name has to be text." };
  const limpio = valor.trim();
  if (limpio.length > MAX_NOMBRE_CONTACTO) return { aviso: `The name can have up to ${MAX_NOMBRE_CONTACTO} characters.` };
  return { nombre: limpio || null };
}

function etiquetasEnComun(contacto: readonly string[], organizacion: readonly string[]): number {
  const propias = new Set(organizacion.map((etiqueta) => etiqueta.toLowerCase()));
  return contacto.filter((etiqueta) => propias.has(etiqueta.toLowerCase())).length;
}

/**
 * Up to MAX_SUGERIDOS contacts: most participations first, then the most tags shared with the
 * organization, then the most recent participation. The email breaks any remaining tie.
 */
export function sugeridosDe(
  contactos: readonly OrganizacionVoluntario[],
  etiquetasOrganizacion: readonly string[],
  maximo: number = MAX_SUGERIDOS,
): OrganizacionVoluntario[] {
  return [...contactos]
    .sort((a, b) => {
      if (b.participaciones !== a.participaciones) return b.participaciones - a.participaciones;
      const comun = etiquetasEnComun(b.etiquetas, etiquetasOrganizacion) - etiquetasEnComun(a.etiquetas, etiquetasOrganizacion);
      if (comun !== 0) return comun;
      const ultimaA = a.ultimaParticipacion ?? "";
      const ultimaB = b.ultimaParticipacion ?? "";
      if (ultimaA !== ultimaB) return ultimaA < ultimaB ? 1 : -1;
      return a.email < b.email ? -1 : a.email > b.email ? 1 : 0;
    })
    .slice(0, maximo);
}

/** Search by name or email, ignoring case. An empty query keeps everyone. */
export function buscarContactos<T extends { email: string; nombre: string | null }>(lista: readonly T[], consulta: string): T[] {
  const q = consulta.trim().toLowerCase();
  if (!q) return [...lista];
  return lista.filter((contacto) => contacto.email.includes(q) || (contacto.nombre ?? "").toLowerCase().includes(q));
}
