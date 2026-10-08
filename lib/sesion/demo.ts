import type { SesionFila, Usuario } from "@/lib/db/tipos";
import type { Idioma } from "@/lib/ui/idioma";

export const AVISO_FIRMA_DEMO = "Demo mode can't send payments. Sign in with your email to continue.";
export const AVISO_PROYECTO_DEMO = "Demo mode cannot create events. Sign in with your email to create one.";

const ROLES_DEMO = ["organizador", "voluntario"] as const;

export type RolDemo = (typeof ROLES_DEMO)[number];

const FILAS: Record<RolDemo, Usuario> = {
  organizador: {
    id: "demo-organizador",
    email: "demo-organizador@hyto.demo",
    nombre: "Organizer (demo)",
    rol: "organizador",
  },
  voluntario: {
    id: "demo-voluntario",
    email: "demo-voluntario@hyto.demo",
    nombre: "Volunteer (demo)",
    rol: "voluntario",
  },
};

export function demoHabilitado(env: NodeJS.ProcessEnv | { HYTO_DEMO_LOGIN?: string } = process.env): boolean {
  return env.HYTO_DEMO_LOGIN?.trim() === "1";
}

export function usuariosDemo(): Usuario[] {
  return ROLES_DEMO.map((rol) => ({ ...FILAS[rol] }));
}

export function usuarioDemo(rol: RolDemo): Usuario {
  return { ...FILAS[rol] };
}

const NOMBRES_DEMO: Record<string, Record<Idioma, string>> = {
  "organizer (demo)": { en: "Organizer (demo)", es: "Organizador (demo)" },
  "volunteer (demo)": { en: "Volunteer (demo)", es: "Voluntario (demo)" },
  "organizador (demo)": { en: "Organizer (demo)", es: "Organizador (demo)" },
  "voluntario (demo)": { en: "Volunteer (demo)", es: "Voluntario (demo)" },
};

/** The stored demo name, in the session language. Any other name is unchanged. */
export function nombreDemoVisible(nombre: string | null | undefined, idioma: Idioma): string | null {
  const limpio = (nombre ?? "").trim();
  if (!limpio) return null;
  return NOMBRES_DEMO[limpio.toLowerCase()]?.[idioma] ?? limpio;
}

export function rolDemoDe(valor: unknown): RolDemo | null {
  if (valor === "organizador" || valor === "voluntario") return valor;
  return null;
}

export function sesionEsDemo(sesion: Pick<SesionFila, "email" | "usuarioId">): boolean {
  const email = sesion.email.trim().toLowerCase();
  return usuariosDemo().some((usuario) => usuario.email === email || usuario.id === sesion.usuarioId);
}

export function rechazarFirmaDemo(sesion: Pick<SesionFila, "email" | "usuarioId">): Response | null {
  if (!sesionEsDemo(sesion)) return null;
  return Response.json({ aviso: AVISO_FIRMA_DEMO }, { status: 403 });
}
