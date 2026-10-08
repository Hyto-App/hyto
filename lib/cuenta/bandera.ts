/**
 * The account-type step stays off unless HYTO_TIPO_CUENTA is exactly "on".
 * Unset, empty, and anything else keep the app as it is today.
 */
export const HYTO_TIPO_CUENTA = "HYTO_TIPO_CUENTA";

export type EntornoTipoCuenta = {
  HYTO_TIPO_CUENTA?: string;
  [clave: string]: string | undefined;
};

export function tipoCuentaActivo(env: EntornoTipoCuenta = process.env): boolean {
  const valor = (env.HYTO_TIPO_CUENTA ?? "off").trim().toLowerCase();
  return valor === "on";
}
