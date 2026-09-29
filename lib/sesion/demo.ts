import type { SesionFila, Usuario } from "@/lib/db/tipos";

export const AVISO_FIRMA_DEMO = "Demo mode: signatures are off";
export const AVISO_PROYECTO_DEMO = "Demo mode cannot create projects.";

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
