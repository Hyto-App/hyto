import { detalleMonto } from "@/lib/admin/vista";
import type { TareaAdmin } from "@/lib/admin/tipos";
import { netoEnCentavos } from "@/lib/escrow/recibido";
import { explicarPago, formatearMonto } from "@/lib/integrante/formato";
import { texto } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";

type TareaPago = Pick<TareaAdmin, "tipo" | "monto" | "tope" | "estado" | "montoConfirmado" | "montoRevisado">;

/**
 * What a paid task shows to the organizer: the net the person received (the same figure the volunteer
 * sees) and, as a second line, the gross minus the processor fee. Null when the task is not paid.
 */
export function pagoNetoTarea(tarea: TareaPago, idioma: Idioma = "en"): { corto: string; detalle: string | null } | null {
  if (tarea.estado !== "pagado") return null;
  const cifra = detalleMonto(tarea as TareaAdmin).cifra;
  const pago = explicarPago(
    { tipo: tarea.tipo, monto: tarea.monto, tope: tarea.tope, montoConfirmado: tarea.tipo === "reembolso" ? cifra : null },
    idioma,
  );
  if (pago?.corto) return { corto: pago.corto, detalle: pago.detalle };
  const bruto = formatearMonto(cifra, idioma);
  return bruto ? { corto: bruto, detalle: null } : null;
}

/** The event total paid, as net received, with the gross and the fee behind it. Budget math stays gross. */
export function pagadoNetoEvento(tareas: readonly TareaPago[], idioma: Idioma = "en"): { corto: string; detalle: string | null } {
  let bruto = 0;
  let neto = 0;
  for (const tarea of tareas) {
    if (tarea.estado !== "pagado") continue;
    const cifra = detalleMonto(tarea as TareaAdmin).cifra;
    const partes = netoEnCentavos(cifra);
    const b = Math.round(Number(partes?.bruto ?? cifra) * 100);
    const n = partes ? Math.round(Number(partes.neto) * 100) : b;
    if (Number.isFinite(b)) bruto += b;
    if (Number.isFinite(n)) neto += n;
  }
  const corto = formatearMonto((neto / 100).toFixed(2), idioma);
  if (bruto === neto) return { corto, detalle: null };
  return {
    corto,
    detalle: texto(idioma, "revision.brutoMenosComision", {
      bruto: formatearMonto((bruto / 100).toFixed(2), idioma),
      comision: formatearMonto(((bruto - neto) / 100).toFixed(2), idioma),
    }),
  };
}
