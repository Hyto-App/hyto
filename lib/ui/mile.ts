export const ESTADOS_MILE = ["descansando", "buscando", "la-tengo", "rechazado", "icono", "cara-neutra", "cara-feliz"] as const;

export type EstadoMile = (typeof ESTADOS_MILE)[number];

export type TemaMile = "dark" | "light";

export function rutaMile(estado: EstadoMile, tema: TemaMile): string {
  return `/mile/mile-${estado}-${tema}.svg`;
}

/** Halo behind Mile: shown by default from 96 px up. */
export function conHalo(tamano: number, halo?: boolean): boolean {
  return halo ?? tamano >= 96;
}
