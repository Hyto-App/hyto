/** Mile out of the chest: seven states, one inline SVG (components/ui/Mile.tsx). */
export const ESTADOS_MILE = ["reposo", "mirando", "leyendo", "listo", "recomendando", "celebrando", "preocupada"] as const;

export type EstadoMile = (typeof ESTADOS_MILE)[number];

/** Names of the chest-Mile families, kept so old callers and stored values still resolve. */
export const ALIAS_MILE = {
  descansando: "reposo",
  buscando: "leyendo",
  "la-tengo": "listo",
  rechazado: "preocupada",
  "cara-feliz": "celebrando",
  icono: "reposo",
  "cara-neutra": "reposo",
} as const satisfies Record<string, EstadoMile>;

export type EstadoMileEntrada = EstadoMile | keyof typeof ALIAS_MILE;

export function estadoMile(estado: EstadoMileEntrada): EstadoMile {
  return estado in ALIAS_MILE ? ALIAS_MILE[estado as keyof typeof ALIAS_MILE] : (estado as EstadoMile);
}

/** Below this size Mile hides the sparkle and the shadow. */
export const TAMANO_MINIMO_DETALLE = 56;

export function conDetalle(tamano: number): boolean {
  return tamano >= TAMANO_MINIMO_DETALLE;
}

/** Furthest the eyes travel (SVG units) when Mile follows the cursor. */
export const ALCANCE_OJOS = 10;

/** Eye offset toward a point, relative to the centre of Mile, capped at ALCANCE_OJOS. */
export function desplazarOjos(dx: number, dy: number): { x: number; y: number } {
  const largo = Math.hypot(dx, dy);
  if (largo === 0) return { x: 0, y: 0 };
  const factor = Math.min(1, largo / 120) * ALCANCE_OJOS;
  return { x: (dx / largo) * factor, y: (dy / largo) * factor };
}
