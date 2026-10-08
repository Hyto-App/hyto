/**
 * Hides most of an email for anyone who is not allowed to see it:
 * ana.prueba@gmail.com becomes a•••@gmail.com.
 */
export function enmascararCorreo(correo: string): string {
  const limpio = correo.trim();
  const arroba = limpio.lastIndexOf("@");
  if (arroba < 0) return limpio ? "•••" : "";
  const local = limpio.slice(0, arroba);
  const dominio = limpio.slice(arroba);
  const inicial = Array.from(local)[0] ?? "";
  return `${inicial}•••${dominio}`;
}
