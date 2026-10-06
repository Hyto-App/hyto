import { normalizarMonto } from "@/lib/admin/vista";
import { AVISO_MONTO_INVALIDO } from "@/lib/escrow/monto";

/** Digits and one decimal separator. A leading minus stays so a negative amount can be rejected. */
export function escribirMonto(valor: string): string {
  const negativo = valor.trimStart().startsWith("-");
  const limpio = valor.replace(/[^\d.,]/g, "").replace(/,/g, ".");
  const punto = limpio.indexOf(".");
  const cuerpo = punto < 0 ? limpio : `${limpio.slice(0, punto)}.${limpio.slice(punto + 1).replace(/\./g, "").slice(0, 2)}`;
  if (!cuerpo) return "";
  return negativo ? `-${cuerpo}` : cuerpo;
}

/** Empty is still being typed. Anything else must be a positive amount with at most two decimals. */
export function avisoMontoEntrada(valor: string): string | null {
  const texto = valor.trim();
  if (!texto || texto === ".") return null;
  if (!normalizarMonto(texto)) return AVISO_MONTO_INVALIDO;
  return null;
}
