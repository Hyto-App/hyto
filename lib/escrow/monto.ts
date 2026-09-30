import { centavos, normalizarMonto } from "@/lib/admin/vista";

export const AVISO_MONTO_INVALIDO = "Enter an amount greater than zero, with up to two decimals.";
export const AVISO_MONTO_TOPE = "The amount cannot be higher than the limit.";
export const AVISO_CONFIRMAR_MONTO = "Confirm an amount within the limit before deploying.";
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

export function validarMontoConfirmado(
  valor: unknown,
  tope: string | null,
  presupuesto: string,
): { monto: string } | { aviso: string } {
  const texto =
    typeof valor === "number" && Number.isFinite(valor) ? String(valor) : typeof valor === "string" ? valor : "";
  const normal = normalizarMonto(texto);
  if (!normal) return { aviso: AVISO_MONTO_INVALIDO };
  if (cifraConfirmada(normal, tope, presupuesto) === null) return { aviso: AVISO_MONTO_TOPE };
  return { monto: normal };
}

function textoTope(tope: string | null, presupuesto: string): string | null {
  return normalizarMonto(tope ?? "") ?? normalizarMonto(presupuesto);
}
