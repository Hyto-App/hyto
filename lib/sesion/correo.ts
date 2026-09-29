import { verificarJwt, type AjustesJwt } from "./jwt";

export type CorreoToken = {
  correo: string;
  sub: string;
};

export async function correoDelToken(token: string, correoPedido: string, ajustes?: AjustesJwt): Promise<CorreoToken | null> {
  const claims = await verificarJwt(token, ajustes);
  if (!claims) return null;
  const sub = texto(claims.sub) || texto(claims.user_id) || texto(claims.uid);
  if (!sub) return null;
  const pedido = correoPedido.trim().toLowerCase();
  if (!pedido.includes("@")) return null;
  const claim = texto(claims.email).toLowerCase();
  if (!claim || claim !== pedido) return null;
  return { correo: claim, sub };
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}
