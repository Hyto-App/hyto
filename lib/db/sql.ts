/**
 * Near-copy lookup for the SQL store. phash is 16 hex chars (64-bit dHash).
 * Callers must pass a validated id, phash, and distance; this string is not for untrusted text.
 */
export function consultaPhashCercano(exceptoId: string, phash: string, distancia: number): string {
  if (!/^[A-Za-z0-9_-]+$/.test(exceptoId)) throw new Error("id");
  if (!/^[0-9a-f]{16}$/.test(phash)) throw new Error("phash");
  if (!Number.isInteger(distancia) || distancia < 0 || distancia > 64) throw new Error("distancia");
  return [
    "select id,",
    `bit_count((('x' || lpad(phash, 16, '0'))::bit(64) # ('x' || '${phash}')::bit(64)))::int as distancia`,
    "from evidencias",
    "where phash is not null",
    `and id <> '${exceptoId}'`,
    `and bit_count((('x' || lpad(phash, 16, '0'))::bit(64) # ('x' || '${phash}')::bit(64))) <= ${distancia}`,
  ].join(" ");
}

export function sentencias(sql: string): string[] {
  return sql
    .split(";")
    .map((parte) => parte.replace(/--.*$/gm, "").trim())
    .filter((parte) => parte.length > 0);
}
