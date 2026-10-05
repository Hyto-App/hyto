import { compararFechaPedido, leerFechaRecibo, leerMontoRecibo, type MonedaRecibo } from "./recibo-parser";
import type { RespuestaRecibo } from "./recibo-preguntas";

export const MARCA_MONEDA_DISTINTA = "Different currency: the organizer confirms the USDC to return";

export type RespuestasDecision = {
  comercio: RespuestaRecibo;
  producto: RespuestaRecibo;
  total: RespuestaRecibo;
  fecha: RespuestaRecibo;
  fechaPedido: RespuestaRecibo;
  tipoProducto: RespuestaRecibo;
};

export type DatosDecision = {
  merchant: string | null;
  item: string | null;
  amountRaw: string | null;
  currency: MonedaRecibo | null;
  dateRaw: string | null;
  dateIso: string | null;
  pedido: string;
  /** "no" means the photo is not a receipt. Omitted does not reject. */
  esRecibo?: RespuestaRecibo | null;
};

export type EntradaDecision = {
  respuestas: RespuestasDecision;
  datos: DatosDecision;
  /** Accepted and ignored. A colón total is never compared with this USDC cap. */
  topeUsdc?: string | null;
};

export type ResultadoDecision = "ok" | "needs_clarification" | "rechazo_duro";

export type DecisionRecibo = {
  resultado: ResultadoDecision;
  /** This path never applies the reimbursement cap of 40. */
  nota: null;
  exceso: false;
  marca: string | null;
  motivos: string[];
  topeUsdc: string | null;
};

/**
 * Missing or unclear data asks for clarification.
 * A hard reject happens only when a present fact contradicts the request:
 * the date differs, the expense is a different kind, or the photo is not a receipt.
 * CRC is not an excess over the USDC cap. There is no exchange rate.
 */
export function decidirRecibo(entrada: EntradaDecision): DecisionRecibo {
  const monto = entrada.datos.amountRaw ? leerMontoRecibo(entrada.datos.amountRaw) : null;
  const moneda = monto?.moneda ?? monedaCampo(entrada.datos.currency);
  const fecha = fechaDeDatos(entrada.datos);
  const comparacion = compararFechaPedido(entrada.datos.pedido, fecha);
  const marca = moneda === "CRC" ? MARCA_MONEDA_DISTINTA : null;
  const base = { nota: null, exceso: false as const, marca, topeUsdc: entrada.topeUsdc ?? null };

  const duros: string[] = [];
  if (entrada.datos.esRecibo === "no") duros.push("no_es_recibo");
  if (fecha && comparacion === "no_coincide") duros.push("fecha_distinta");
  const productoPresente = Boolean(entrada.datos.item?.trim()) || entrada.respuestas.producto === "yes";
  if (productoPresente && entrada.respuestas.tipoProducto === "no") duros.push("gasto_distinto");
  if (duros.length > 0) return { resultado: "rechazo_duro", motivos: duros, ...base };

  const aclarar: string[] = [];
  if (entrada.datos.esRecibo === "unclear") aclarar.push("es_recibo");
  if (entrada.respuestas.comercio !== "yes" || !texto(entrada.datos.merchant)) aclarar.push("comercio");
  if (entrada.respuestas.producto !== "yes" || !texto(entrada.datos.item)) aclarar.push("producto");
  if (entrada.respuestas.total !== "yes" || !monto || monto.centavos <= 0) aclarar.push("total");
  if (!moneda) aclarar.push("moneda");
  if (entrada.respuestas.fecha !== "yes" || !fecha) aclarar.push("fecha");
  if (entrada.respuestas.fechaPedido !== "yes" || comparacion !== "coincide") aclarar.push("fecha_pedido");
  if (entrada.respuestas.tipoProducto !== "yes") aclarar.push("tipo_producto");
  if (aclarar.length > 0) return { resultado: "needs_clarification", motivos: aclarar, ...base };

  return { resultado: "ok", motivos: marca ? ["moneda_distinta"] : [], ...base };
}

function fechaDeDatos(datos: DatosDecision): string | null {
  if (datos.dateIso) {
    const iso = leerFechaRecibo(datos.dateIso);
    if (iso) return iso;
  }
  if (datos.dateRaw) return leerFechaRecibo(datos.dateRaw);
  return null;
}

function monedaCampo(valor: string | null): MonedaRecibo | null {
  if (valor === "CRC" || valor === "USD") return valor;
  return null;
}

function texto(valor: string | null): boolean {
  return Boolean(valor?.trim());
}
