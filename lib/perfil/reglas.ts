export const ETIQUETAS = [
  "responsable",
  "amable",
  "puntual",
  "creativo",
  "equipo",
  "comunicativo",
  "organizado",
  "proactivo",
] as const;

export type EtiquetaVoluntario = (typeof ETIQUETAS)[number];

export type FichaVoluntario = {
  experiencia: string | null;
  etiquetas: EtiquetaVoluntario[];
};

const MAX_EXPERIENCIA = 280;
const MAX_ETIQUETAS = 5;

const PERMITIDAS = new Set<string>(ETIQUETAS);

export function leerFicha(body: unknown): FichaVoluntario | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Send the profile as JSON." };
  const crudo = body as Record<string, unknown>;
  const experiencia = leerExperiencia(crudo.experiencia);
  if (experiencia === false) return { aviso: `Experience can have up to ${MAX_EXPERIENCIA} characters.` };
  if (!Array.isArray(crudo.etiquetas)) return { aviso: "Choose tags from the list." };
  const etiquetas: EtiquetaVoluntario[] = [];
  for (const item of crudo.etiquetas) {
    if (typeof item !== "string" || !PERMITIDAS.has(item)) return { aviso: "Choose tags from the list." };
    const etiqueta = item as EtiquetaVoluntario;
    if (!etiquetas.includes(etiqueta)) etiquetas.push(etiqueta);
  }
  if (etiquetas.length > MAX_ETIQUETAS) return { aviso: "Choose up to 5 tags." };
  return { experiencia, etiquetas };
}

export function fichaDe(usuario: { experiencia?: string | null; etiquetas?: string[] | null } | null | undefined): FichaVoluntario | null {
  if (!usuario) return null;
  const experiencia = typeof usuario.experiencia === "string" && usuario.experiencia.trim() ? usuario.experiencia.trim() : null;
  const etiquetas = (usuario.etiquetas ?? []).filter((item): item is EtiquetaVoluntario => PERMITIDAS.has(item)).slice(0, MAX_ETIQUETAS);
  if (!experiencia && etiquetas.length === 0) return null;
  return { experiencia, etiquetas };
}

export function etiquetasGuardadas(valor: string | null | undefined): EtiquetaVoluntario[] {
  if (!valor) return [];
  try {
    const lista = JSON.parse(valor) as unknown;
    if (!Array.isArray(lista)) return [];
    return lista.filter((item): item is EtiquetaVoluntario => typeof item === "string" && PERMITIDAS.has(item)).slice(0, MAX_ETIQUETAS);
  } catch {
    return [];
  }
}

function leerExperiencia(valor: unknown): string | null | false {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== "string") return false;
  const limpio = valor.trim();
  if (!limpio) return null;
  if (limpio.length > MAX_EXPERIENCIA) return false;
  return limpio;
}
