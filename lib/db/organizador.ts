const DEMO_ORGANIZADOR = "demo-organizador";

export type UsuarioParaRelleno = {
  id: string;
  rol: string;
};

export type ProyectoParaRelleno = {
  id: string;
  organizadorId: string | null;
};

// Misma regla que drizzle/0002_organizador_proyecto.sql: el id más chico
// entre los usuarios con rol organizador, sin la cuenta fija del demo.
export function idOrganizadorGlobal(usuarios: UsuarioParaRelleno[]): string | null {
  const ids = usuarios
    .filter((usuario) => usuario.rol === "organizador" && usuario.id !== DEMO_ORGANIZADOR)
    .map((usuario) => usuario.id)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return ids[0] ?? null;
}

export function aplicarRellenoOrganizador<T extends ProyectoParaRelleno>(proyectos: T[], usuarios: UsuarioParaRelleno[]): T[] {
  const organizadorId = idOrganizadorGlobal(usuarios);
  if (!organizadorId) return proyectos.map((proyecto) => ({ ...proyecto }));
  return proyectos.map((proyecto) => ({
    ...proyecto,
    organizadorId: proyecto.organizadorId ?? organizadorId,
  }));
}
