export type IntencionIngreso = "signup" | "signin";

export const CLAVE_INTENCION = "hyto-intencion";

export function intencionDe(valor: unknown): IntencionIngreso | null {
  if (valor === "signup" || valor === "signin") return valor;
  return null;
}

/** Friendbot, trustline, and account creation run only for an explicit Sign up. */
export function debeProvisionar(intencion: IntencionIngreso, provisionar: boolean): boolean {
  return intencion === "signup" && provisionar === true;
}

export function guardarIntencion(valor: IntencionIngreso, almacenamiento: Pick<Storage, "setItem"> = sessionStorage): void {
  try {
    almacenamiento.setItem(CLAVE_INTENCION, valor);
  } catch {
    // A blocked store falls back to Sign in, which does not provision.
  }
}

export function leerIntencion(almacenamiento: Pick<Storage, "getItem"> = sessionStorage): IntencionIngreso {
  try {
    return almacenamiento.getItem(CLAVE_INTENCION) === "signup" ? "signup" : "signin";
  } catch {
    return "signin";
  }
}

export function olvidarIntencion(almacenamiento: Pick<Storage, "removeItem"> = sessionStorage): void {
  try {
    almacenamiento.removeItem(CLAVE_INTENCION);
  } catch {
    // Leaving the flag is safe: Sign in never provisions.
  }
}
