import { centavos, normalizarMonto } from "@/lib/admin/vista";

export const AVISO_MONTO_INVALIDO = "Enter an amount greater than zero, with up to two decimals.";
export const AVISO_MONTO_TOPE = "The amount cannot be higher than the limit.";
export const AVISO_CONFIRMAR_MONTO = "Confirm the amount before you pay.";
export const AVISO_CONFIRMAR_FONDEO = "Confirm an amount within the limit before funding.";
export const AVISO_MONTO_TARDE = "This payment is already set up.";

/** Confirmed reimbursement amount in human USDC units, or null when it is missing or above the cap. */
export function cifraConfirmada(
  monto: string | null | undefined,
  tope: string | null,
  presupuesto: string,
): number | null {
  const limite = textoTope(tope, presupuesto);
  const normal = normalizarMonto(monto ?? "");
  if (!limite || !normal) return null;
  const cifra = centavos(normal);
  if (cifra <= 0 || cifra > centavos(limite)) return null;
  return cifra / 100;
}

/**
 * The amount that can be paid. A reading above the task cap becomes the cap.
 * Lower amounts stay as entered. Invalid text stays null.
 */
export function montoDentroDelTope(valor: string, tope: string | null, presupuesto: string): string | null {
  const limite = textoTope(tope, presupuesto);
  const normal = normalizarMonto(valor);
  if (!limite || !normal) return null;
  return centavos(normal) > centavos(limite) ? limite : normal;
}

export function validarMontoConfirmado(
  valor: unknown,
  tope: string | null,
  presupuesto: string,
): { monto: string } | { aviso: string } {
  const texto =
    typeof valor === "number" && Number.isFinite(valor) ? String(valor) : typeof valor === "string" ? valor : "";
  const ajustado = montoDentroDelTope(texto, tope, presupuesto);
  if (!ajustado) return { aviso: AVISO_MONTO_INVALIDO };
  return { monto: ajustado };
}

function textoTope(tope: string | null, presupuesto: string): string | null {
  return normalizarMonto(tope ?? "") ?? normalizarMonto(presupuesto);
}
