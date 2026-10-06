import { normalizarMonto } from "@/lib/admin/vista";
import { AVISO_MONTO_INVALIDO } from "@/lib/escrow/monto";

/**
 * Keeps what the person typed, including a minus or a letter, so the field can
 * show an error instead of turning "-3" into "3" or "4a" into "4".
 * A decimal comma becomes a dot. Extra characters other than digits, a sign, and letters are dropped.
 */
export function escribirMonto(valor: string): string {
  const limpio = valor.replace(/,/g, ".").replace(/[^\d.a-zA-Z-]/g, "");
  return limpio.slice(0, 16);
}

/** Empty, or a trailing dot, is still being typed. Zero, a minus, and letters are errors. */
export function avisoMontoEntrada(valor: string): string | null {
  const texto = valor.trim();
  if (!texto || texto === "." || /^\d+\.$/.test(texto)) return null;
  if (!normalizarMonto(texto)) return AVISO_MONTO_INVALIDO;
  return null;
}
