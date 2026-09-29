export function sentencias(sql: string): string[] {
  return sql
    .split(";")
    .map((parte) => parte.replace(/--.*$/gm, "").trim())
    .filter((parte) => parte.length > 0);
}
