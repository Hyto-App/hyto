/** A top answer this close to the next one counts as unsure. */
export const MARGEN_CERCA = 0.15;

/** True when the winning probability is not clearly ahead of the second. */
export function probabilidadesCerca(valores: readonly number[]): boolean {
  if (valores.length < 2) return false;
  const orden = [...valores].sort((a, b) => b - a);
  return orden[0] - orden[1] <= MARGEN_CERCA;
}

/**
 * A numeric noul is a probability of "yes". 0.5 is a tie. 0.6 is 0.2 away, not close.
 * A boolean noul has no probability, so it is never close.
 */
export function noulCerca(valor: number): boolean {
  if (!Number.isFinite(valor)) return false;
  return Math.abs(2 * valor - 1) <= MARGEN_CERCA;
}
