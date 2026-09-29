import { esCuenta } from "@/lib/escrow/cuerpos";

export type CorreoToken = {
  correo: string;
  sub: string;
};

const CLAVES_WALLET = ["wallet", "stellarAddress", "stellar_address", "address"];

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

// Si el JWT del ingreso trae una G…, es la wallet de ese login.
// El token de Cavos que usa Hyto hoy no la trae: la G… la deriva el dispositivo.
export function walletDelToken(token: string): string | null {
  const partes = token.split(".");
  if (partes.length < 2 || !partes[1]) return null;
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  return walletEn(json, 0);
}

function walletEn(valor: unknown, profundidad: number): string | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor) || profundidad > 2) return null;
  const crudo = valor as Record<string, unknown>;
  for (const clave of CLAVES_WALLET) {
    const cuenta = texto(crudo[clave]);
    if (esCuenta(cuenta)) return cuenta;
  }
  for (const anidado of [crudo.identity, crudo.user]) {
    const hallada = walletEn(anidado, profundidad + 1);
    if (hallada) return hallada;
  }
  return null;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}
