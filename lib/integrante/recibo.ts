import { enlacePago } from "@/lib/admin/vista";
import { brutoDeNeto, brutoFondado, netoEnCentavos } from "@/lib/escrow/recibido";
import type { Idioma } from "@/lib/ui/idioma";
import { formatearFecha, formatearMonto } from "./formato";

/**
 * In-app receipt for the person who got paid.
 * There is no payment-timestamp column. The date is `enviadaEn`, which is
 * `evidencias.creada_en`: the same instant Account already shows beside a paid task.
 */
export type DatosRecibo = {
  neto: string;
  bruto: string;
  comision: string;
  fecha: string | null;
  tarea: string;
  evento: string | null;
  red: string | null;
};

type TareaRecibo = {
  tipo: "trabajo" | "reembolso";
  monto: string;
  tope: string | null;
  montoConfirmado?: string | null;
  montoPagado?: string | null;
  titulo: string;
  evento?: string | null;
  enviadaEn?: string | null;
  hashPago?: string | null;
};

export function datosRecibo(tarea: TareaRecibo, idioma: Idioma = "en"): DatosRecibo | null {
  const bruto =
    brutoFondado(tarea, tarea.montoConfirmado) ?? (tarea.montoPagado ? brutoDeNeto(tarea.montoPagado) : null);
  if (!bruto) return null;
  const partes = netoEnCentavos(bruto);
  if (!partes) return null;
  const neto = formatearMonto(partes.neto, idioma);
  const apartado = formatearMonto(partes.bruto, idioma);
  const comision = formatearMonto(partes.comision, idioma);
  if (!neto || !apartado || !comision) return null;
  const titulo = tarea.titulo.trim();
  if (!titulo) return null;
  return {
    neto,
    bruto: apartado,
    comision,
    fecha: fechaDe(tarea.enviadaEn, idioma),
    tarea: titulo,
    evento: tarea.evento?.trim() || null,
    red: enlacePago(tarea.hashPago),
  };
}

function fechaDe(iso: string | null | undefined, idioma: Idioma): string | null {
  if (!iso?.trim()) return null;
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return null;
  const texto = formatearFecha(iso, idioma);
  return texto && texto !== iso.trim() ? texto : null;
}
