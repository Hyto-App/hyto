/**
 * The volunteer profile stays off unless HYTO_PERFIL_VOLUNTARIO is exactly "on".
 * Unset, empty, and anything else keep the app as it is today.
 */
export const HYTO_PERFIL_VOLUNTARIO = "HYTO_PERFIL_VOLUNTARIO";

export type EntornoPerfil = {
  HYTO_PERFIL_VOLUNTARIO?: string;
  [clave: string]: string | undefined;
};

export function perfilVoluntarioActivo(env: EntornoPerfil = process.env): boolean {
  const valor = (env.HYTO_PERFIL_VOLUNTARIO ?? "off").trim().toLowerCase();
  return valor === "on";
}

/**
 * Public profiles, phase 1 (profile page, figures, privacy settings, suggested people).
 * Off unless HYTO_PERFIL_PUBLICO is exactly "on". Turn it on only after migration 0014.
 */
export const HYTO_PERFIL_PUBLICO = "HYTO_PERFIL_PUBLICO";

export function perfilPublicoActivo(env: { HYTO_PERFIL_PUBLICO?: string; [clave: string]: string | undefined } = process.env): boolean {
  return (env.HYTO_PERFIL_PUBLICO ?? "off").trim().toLowerCase() === "on";
}
