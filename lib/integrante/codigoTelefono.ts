/**
 * Short code to open the same task on a phone. Stable for a task id.
 * It is a label, not a secret and not an invite.
 */
export function codigoTelefono(tareaId: string): string {
  const limpio = tareaId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (limpio.length >= 4 && limpio.length <= 12) return limpio;
  let n = 2166136261;
  for (const caracter of tareaId) n = Math.imul(n ^ caracter.charCodeAt(0), 16777619);
  return (n >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}
