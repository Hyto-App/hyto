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
