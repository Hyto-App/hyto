import type { Usuario } from "@/lib/db/tipos";
import { perfilVoluntarioActivo } from "./bandera";
import { fichaDe, type FichaVoluntario } from "./reglas";

export function personaVisible(
  usuario: Usuario | undefined,
  usuarioId: string,
): { usuarioId: string; email: string; ficha?: FichaVoluntario } {
  const base = { usuarioId, email: usuario?.email ?? usuarioId };
  if (!perfilVoluntarioActivo()) return base;
  const ficha = fichaDe(usuario);
  return ficha ? { ...base, ficha } : base;
}
