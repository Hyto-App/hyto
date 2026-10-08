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
