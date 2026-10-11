/**
 * Same rule as `iniciales` in components/ui/Marca.tsx (a client module), usable on the server.
 * Two letters from the first and last word; the parenthesis and symbols are ignored.
 */
export function iniciales(nombre: string, email?: string | null): string {
  const partes = nombre
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((parte) => /\p{L}/u.test(parte));
  const letra = (palabra: string) => palabra.match(/\p{L}/u)?.[0] ?? "";
  if (partes.length >= 2) return `${letra(partes[0])}${letra(partes[partes.length - 1])}`.toUpperCase();
  if (partes.length === 1) return letra(partes[0]).toUpperCase();
  const delCorreo = letra((email ?? "").split("@")[0] ?? "");
  return delCorreo ? delCorreo.toUpperCase() : "•";
}
