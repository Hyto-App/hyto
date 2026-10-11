import type { Usuario } from "@/lib/db/tipos";
import { nombreVisible } from "@/lib/sesion/nombre";
import { perfilVoluntarioActivo } from "./bandera";
import { fichaDe, type FichaVoluntario } from "./reglas";

export function personaVisible(
  usuario: Usuario | undefined,
  usuarioId: string,
): { usuarioId: string; email: string; nombre?: string; ficha?: FichaVoluntario } {
  // The screens show the name, never the email; `email` stays for callers that still need it.
  const nombre = usuario ? nombreVisible(usuario.nombre, usuario.email) : null;
  const base = { usuarioId, email: usuario?.email ?? usuarioId, ...(nombre ? { nombre } : {}) };
  if (!perfilVoluntarioActivo()) return base;
  const ficha = fichaDe(usuario);
  return ficha ? { ...base, ficha } : base;
}
