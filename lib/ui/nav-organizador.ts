/** Event id the organizer links point at. The open event wins when this session organizes it; otherwise the first organized event. A demo organizer with no membership still opens the demo event. */
export function idNavOrganizador(ruta: string, organizados: readonly string[], demoOrganizador: boolean): string | null {
  const coincidencia = ruta.match(/^\/eventos\/([^/]+)/);
  const deRuta = coincidencia?.[1] && coincidencia[1] !== "nuevo" ? coincidencia[1] : null;
  if (deRuta && organizados.includes(deRuta)) return deRuta;
  if (organizados[0]) return organizados[0];
  if (demoOrganizador) return "demo";
  return null;
}

export function muestraNavOrganizador(organizados: readonly string[], demoOrganizador: boolean): boolean {
  return demoOrganizador || organizados.length > 0;
}
