const CLAVE = "hyto-ya-apartado";

function leer(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    if (!crudo) return [];
    const json = JSON.parse(crudo) as unknown;
    if (!Array.isArray(json)) return [];
    return json.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

/** Remembers, in this tab, that the network already holds the money for this task. */
export function recordarApartado(contrato: string): void {
  const id = contrato.trim();
  if (!id || typeof sessionStorage === "undefined") return;
  const lista = leer().filter((item) => item !== id);
  lista.push(id);
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(lista.slice(-20)));
  } catch {
    // A reload without this mark falls back to the network read.
  }
}

export function estaApartado(contrato: string): boolean {
  const id = contrato.trim();
  return id.length > 0 && leer().includes(id);
}
