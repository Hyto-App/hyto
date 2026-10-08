/**
 * Organizations stay off unless HYTO_ORGANIZACIONES is exactly "on".
 * Unset, empty, and anything else keep the app as it is today.
 */
export const HYTO_ORGANIZACIONES = "HYTO_ORGANIZACIONES";

export type EntornoOrganizaciones = {
  HYTO_ORGANIZACIONES?: string;
  [clave: string]: string | undefined;
};

export function organizacionesActivas(env: EntornoOrganizaciones = process.env): boolean {
  const valor = (env.HYTO_ORGANIZACIONES ?? "off").trim().toLowerCase();
  return valor === "on";
}
