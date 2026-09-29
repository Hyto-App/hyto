export type UsuarioCorreo = {
  id: string;
  email: string;
};

export type ProyectoConOrganizador = {
  id: string;
  organizadorId: string | null;
};

// Asigna el usuario de ese email solo a proyectos que todavía no tienen dueño.
// Si el email no existe, no cambia nada y no lanza.
export function asignarOrganizadorPorEmail<T extends ProyectoConOrganizador>(
  proyectos: T[],
  usuarios: UsuarioCorreo[],
  email: string,
  proyectoIds?: readonly string[],
): T[] {
  const buscado = email.trim().toLowerCase();
  const usuario = buscado ? usuarios.find((item) => item.email.trim().toLowerCase() === buscado) : undefined;
  if (!usuario) return proyectos.map((proyecto) => ({ ...proyecto }));
  const filtro = proyectoIds ? new Set(proyectoIds) : null;
  return proyectos.map((proyecto) => {
    if (proyecto.organizadorId) return { ...proyecto };
    if (filtro && !filtro.has(proyecto.id)) return { ...proyecto };
    return { ...proyecto, organizadorId: usuario.id };
  });
}
