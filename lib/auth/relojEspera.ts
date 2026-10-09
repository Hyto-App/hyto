/**
 * One second of the resend countdown. The ref moves in the same turn as the
 * tick, before React paints the enabled button, so the first tap at 0 is not
 * dropped by a guard that still sees the previous second.
 */
export function tickEspera(actual: number, ref: { current: number }): number {
  const siguiente = Math.max(0, actual - 1);
  ref.current = siguiente;
  return siguiente;
}
