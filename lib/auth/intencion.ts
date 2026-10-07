export type IntencionIngreso = "signup" | "signin";

export const CLAVE_INTENCION = "hyto-intencion";

export function intencionDe(valor: unknown): IntencionIngreso | null {
  if (valor === "signup" || valor === "signin") return valor;
  return null;
}

/**
 * Friendbot, trustline, and account creation run for a Sign up, or for a Sign in that just created
 * the Hyto account. A returning Sign in never provisions.
 */
export function debeProvisionar(intencion: IntencionIngreso, provisionar: boolean, nuevo = false): boolean {
  return provisionar === true && (intencion === "signup" || nuevo === true);
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

/**
 * An email sign-in link opens in a new tab, which has none of this tab's sessionStorage. The intent
 * and the return path ride in localStorage instead, for one hour, and are dropped once read.
 */
export const CLAVE_INTENCION_ENLACE = "hyto-intencion-enlace";
export const VIDA_INTENCION_ENLACE_MS = 60 * 60 * 1000;

export type IntencionEnlace = { intencion: IntencionIngreso; retorno: string | null };

export function guardarIntencionEnlace(
  valor: IntencionEnlace,
  almacenamiento?: Pick<Storage, "setItem">,
  ahora = Date.now(),
): void {
  try {
    (almacenamiento ?? window.localStorage).setItem(CLAVE_INTENCION_ENLACE, JSON.stringify({ ...valor, hasta: ahora + VIDA_INTENCION_ENLACE_MS }));
  } catch {
    // Without storage the link signs in, which never provisions.
  }
}

export function tomarIntencionEnlace(
  almacenamiento?: Pick<Storage, "getItem" | "removeItem">,
  ahora = Date.now(),
): IntencionEnlace | null {
  try {
    const almacen = almacenamiento ?? window.localStorage;
    const crudo = almacen.getItem(CLAVE_INTENCION_ENLACE);
    if (!crudo) return null;
    almacen.removeItem(CLAVE_INTENCION_ENLACE);
    const datos = JSON.parse(crudo) as { intencion?: unknown; retorno?: unknown; hasta?: unknown };
    const intencion = intencionDe(datos.intencion);
    if (!intencion || typeof datos.hasta !== "number" || datos.hasta < ahora) return null;
    return { intencion, retorno: typeof datos.retorno === "string" && datos.retorno ? datos.retorno : null };
  } catch {
    return null;
  }
}

/** The intent this tab saved before leaving for Google or Apple, or null when it saved none. */
export function intencionGuardada(almacenamiento: Pick<Storage, "getItem"> = sessionStorage): IntencionIngreso | null {
  try {
    return intencionDe(almacenamiento.getItem(CLAVE_INTENCION));
  } catch {
    return null;
  }
}
