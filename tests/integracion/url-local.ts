export const URL_POR_DEFECTO = "postgres://hyto:hyto@127.0.0.1:5432/hyto_integracion";

export function urlLocal(env: NodeJS.ProcessEnv = process.env): string {
  const pedido = env.HYTO_TEST_DATABASE_URL?.trim();
  return pedido || URL_POR_DEFECTO;
}

export function hostDe(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

/** Nombre de servicio en Docker Compose: una etiqueta DNS, sin puntos. */
export function esServicioDocker(host: string): boolean {
  return /^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?$/.test(host);
}

export function esHostLocal(url: string): boolean {
  const host = hostDe(url);
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  return esServicioDocker(host);
}
