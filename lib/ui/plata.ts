import { centavos } from "@/lib/admin/vista";
import { brutoFondado, partesDePago } from "@/lib/escrow/recibido";
import { formatearDolaresTexto, formatearFecha, formatearMonto } from "@/lib/integrante/formato";
import { FECHA_TASA } from "@/lib/revision/divisas";
import { texto } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";

type LecturaMontos = {
  moneda: string | null;
  montoOriginal: string | null;
  tasa: number | null;
};

export type TareaMontos = {
  tipo: "trabajo" | "reembolso";
  monto: string;
  tope: string | null;
  montoConfirmado?: string | null;
  montoRevisado?: string | null;
  lectura?: LecturaMontos | null;
};

/** Gross that gets reserved. A reimbursement uses the confirmed amount. */
export function brutoVisible(tarea: TareaMontos): string | null {
  return brutoFondado(tarea, tarea.montoConfirmado);
}

/** Organizer line: gross, the 0.3% taken when the payment is sent, and the net. */
export function fraseComision(bruto: string | null, idioma: Idioma): string | null {
  if (!bruto) return null;
  const partes = partesDePago(bruto);
  if (!partes) return null;
  return texto(idioma, "revision.comision", {
    bruto: formatearDolaresTexto(partes.bruto, idioma),
    comision: formatearDolaresTexto(partes.comision, idioma),
    neto: formatearDolaresTexto(partes.neto, idioma),
  });
}

/** Rate line: source, date, and who absorbs a difference with a bank rate. */
export function fraseTasa(lectura: LecturaMontos | null | undefined, idioma: Idioma): string | null {
  if (!lectura?.tasa || !lectura.moneda || lectura.moneda === "USD") return null;
  return texto(idioma, "revision.tasaHyto", {
    fecha: formatearFecha(FECHA_TASA, idioma),
    tasa: String(lectura.tasa),
    moneda: lectura.moneda,
  });
}

/**
 * The three review amounts in one sentence: what was spent, the cap we reserve,
 * and what is actually paid. Null when this is not a reimbursement with a reading.
 */
export function fraseTresMontos(tarea: TareaMontos, idioma: Idioma): string | null {
  if (tarea.tipo !== "reembolso") return null;
  const tope = formatearMonto(tarea.tope ?? tarea.monto, idioma);
  if (!tope) return null;
  const usd = tarea.montoRevisado ? formatearMonto(tarea.montoRevisado, idioma) : "";
  const topeRaw = tarea.tope ?? tarea.monto;
  const revisadoCabe = Boolean(tarea.montoRevisado && centavos(tarea.montoRevisado) > 0 && centavos(tarea.montoRevisado) <= centavos(topeRaw));
  const confirmado = tarea.montoConfirmado ? formatearMonto(tarea.montoConfirmado, idioma) : "";
  const pago = confirmado || (revisadoCabe ? usd : "");
  const original =
    tarea.lectura?.montoOriginal?.trim() && tarea.lectura.moneda && tarea.lectura.moneda !== "USD"
      ? tarea.lectura.montoOriginal.trim()
      : "";
  if (original && usd && pago) {
    return texto(idioma, "revision.tresMontos", { gastado: original, usd, tope, pago });
  }
  if (!original && usd && pago) {
    return texto(idioma, "revision.tresMontosUsd", { usd, tope, pago });
  }
  if (!original && usd) {
    return texto(idioma, "revision.tresMontosSinPago", { usd, tope });
  }
  if (original && usd) {
    return texto(idioma, "revision.tresMontosPendiente", { gastado: original, usd, tope });
  }
  return null;
}
