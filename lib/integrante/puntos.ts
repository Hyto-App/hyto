const MAXIMO = 5;

/**
 * Splits the single `condicion` text into the points the photo must show.
 * Presentation only: separates on line breaks, bullets (•, -, ·), ";" and numbering ("1." / "1)").
 */
export function puntosDeCondicion(condicion: string): string[] {
  const puntos = condicion
    .split(/\r?\n|;|(?:^|\s)[•·](?=\s)|(?:^|\s)-(?=\s)|(?:^|\s)\d+[.)](?=\s)/u)
    .map((punto) => punto.replace(/^\s*(?:[•·-]|\d+[.)])\s*/u, "").trim())
    .filter((punto) => punto.length > 0);
  return puntos.slice(0, MAXIMO);
}
