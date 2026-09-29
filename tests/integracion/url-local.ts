export const URL_POR_DEFECTO = "postgres://hyto:hyto@127.0.0.1:5432/hyto_integracion";

export function urlLocal(): string {
  const pedido = process.env.HYTO_TEST_DATABASE_URL?.trim();
  return pedido || URL_POR_DEFECTO;
}

export function esHostLocal(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}
