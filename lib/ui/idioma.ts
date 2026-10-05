export const COOKIE_IDIOMA = "hyto_idioma";
export const IDIOMAS = ["en", "es"] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** One year. The choice should survive a normal return to the app. */
export const MAX_EDAD_IDIOMA = 60 * 60 * 24 * 365;

export function idiomaDe(valor: string | null | undefined): Idioma {
  return valor === "es" ? "es" : "en";
}

export function encabezadoIdioma(idioma: Idioma, seguro = false): string {
  const segura = seguro ? "; Secure" : "";
  return `${COOKIE_IDIOMA}=${idioma}; Path=/; Max-Age=${MAX_EDAD_IDIOMA}; SameSite=Lax${segura}`;
}

export function guardarIdioma(idioma: Idioma): void {
  const seguro = window.location.protocol === "https:";
  document.cookie = encabezadoIdioma(idioma, seguro);
  document.documentElement.lang = idioma;
}

/** Reads the first language of an Accept-Language header or navigator.language: es* is Spanish, anything else English. */
export function idiomaDeNavegador(valor: string | null | undefined): Idioma {
  const primero = (valor ?? "").split(",")[0]?.split(";")[0]?.trim().toLowerCase() ?? "";
  return primero === "es" || primero.startsWith("es-") ? "es" : "en";
}

export function hayCookieIdioma(cookies: string): boolean {
  return cookies.split(";").some((par) => par.trim().startsWith(`${COOKIE_IDIOMA}=`));
}
