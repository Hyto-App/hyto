/**
 * A funded escrow is one that already holds the token. Trustless Work's `balance`
 * can stay 0 after the fund transaction is on the ledger. The testnet token balance
 * is the other reading. Either one being positive means the budget is locked.
 */

export const CODIGO_YA_FONDEADO = "ya_fondeado";
export const AVISO_YA_FONDEADO =
  "This budget is already locked on the network. Refresh this page. Do not lock it again.";

export function balanceNumerico(valor: unknown): number | null {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : Number.NaN;
  if (!Number.isFinite(numero) || numero < 0) return null;
  return numero;
}

export function aplicarSaldoRed<T extends Record<string, unknown>>(escrow: T, saldoRed: number | null): T {
  const actual = balanceNumerico(escrow.balance);
  if (actual !== null && actual > 0) return escrow;
  if (saldoRed !== null && saldoRed > 0) return { ...escrow, balance: saldoRed };
  return escrow;
}

export function hayFondos(balanceContrato: number | null, saldoRed: number | null): boolean {
  return (balanceContrato !== null && balanceContrato > 0) || (saldoRed !== null && saldoRed > 0);
}
