import { formatearMonto } from "@/lib/integrante/formato";
import { texto } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";

/**
 * Mile's amount, shown above the receipt reading.
 * "₡3,300 ≈ US$6.53" when the photo printed another currency.
 */
export function lineaMontoMile(
  entrada: {
    montoOriginal?: string | null;
    moneda?: string | null;
    montoUsd?: string | null;
  },
  idioma: Idioma,
): string | null {
  const impreso = entrada.montoOriginal?.trim() ?? "";
  const usd = entrada.montoUsd?.trim() ? formatearMonto(entrada.montoUsd.trim(), idioma) : "";
  const otraMoneda = Boolean(impreso && entrada.moneda && entrada.moneda !== "USD");
  if (otraMoneda && usd) return texto(idioma, "revision.mileAmount", { impreso, dolares: usd });
  if (usd) return usd;
  if (impreso) return impreso;
  return null;
}
