/** `/cuentas` stays as an alias so old links, including `?add=passkey#passkey`, still land. */
export function destinoConfiguracion(search: string, hash: string): string {
  const consulta = !search || search === "?" ? "" : search.startsWith("?") ? search : `?${search}`;
  const ancla = !hash ? "" : hash.startsWith("#") ? hash : `#${hash}`;
  return `/configuracion${consulta}${ancla}`;
}
