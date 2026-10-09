import { netoEnCentavos } from "@/lib/escrow/recibido";
import { formatearMonto } from "@/lib/integrante/formato";
import { texto } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";

/**
 * The 0.3% line an organizer sees beside an event amount.
 * Null when there is nothing to set aside, or when the fee rounds to zero.
 */
export function fraseComisionEvento(bruto: string, idioma: Idioma): string | null {
  const partes = netoEnCentavos(bruto);
  if (!partes || partes.comision === "0") return null;
  const fee = formatearMonto(partes.comision, idioma);
  const net = formatearMonto(partes.neto, idioma);
  if (!fee || !net) return null;
  return texto(idioma, "eventos.feeLine", { fee, net });
}
