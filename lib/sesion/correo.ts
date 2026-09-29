export type CorreoToken = {
  correo: string;
  sub: string;
};

export function correoDelToken(token: string, correoPedido: string): CorreoToken | null {
  const partes = token.split(".");
  if (partes.length < 2 || !partes[1]) return null;
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;
  const crudo = json as Record<string, unknown>;
  const sub = texto(crudo.sub) || texto(crudo.user_id) || texto(crudo.uid);
  if (!sub) return null;
  const pedido = correoPedido.trim().toLowerCase();
  if (!pedido.includes("@")) return null;
  const claim = texto(crudo.email)?.toLowerCase() ?? "";
  if (claim && claim !== pedido) return null;
  return { correo: claim || pedido, sub };
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}
