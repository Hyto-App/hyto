import { calcularEstadoTarea } from "@/lib/api/estado-tarea";
import type { Tarea } from "./tipos";

export type IdPaso = "aprobada" | "enviado" | "pagado";
export type EstadoPaso = "hecho" | "ahora" | "despues";
export type IdEvento = "envio" | "mile" | "aprobada" | "camino" | "pagado";

export type PasoActividad = { id: IdPaso; estado: EstadoPaso };
export type EventoActividad = { id: IdEvento; en: string | null };

export type TareaActividad = Pick<Tarea, "estado" | "etapa" | "hashPago" | "enviadaEn" | "nota" | "veredicto" | "revisionFallida">;

/** A stored instant, or null. Never a clock reading invented here. */
export function instanteGuardado(valor: string | null | undefined): string | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const ms = Date.parse(valor);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Payment trail from the same status the server uses.
 * Aprobada: the task is paid. A hash, or a stored etapa, does not approve it.
 * Pago enviado: a payment hash is stored, or the task is already paid.
 * Pagado: estado pagado.
 */
export function marcasPago(tarea: TareaActividad): { aprobada: boolean; enviado: boolean; pagado: boolean } {
  const calculo = calcularEstadoTarea({ estado: tarea.estado, hashPago: tarea.hashPago });
  const pagado = calculo.estado === "pagado";
  const enviado = pagado || calculo.pagoPendiente;
  const aprobada = calculo.etapa === "aprobada";
  return { aprobada, enviado, pagado };
}

/**
 * Each step and each event exists only after it happened.
 * A pending task has no current send: a stored score, an old clock, or a sample etapa
 * does not become "you sent", "Mile reviewed", or "Approved".
 */
export function seguimientoDe(tarea: TareaActividad): { pasos: PasoActividad[]; eventos: EventoActividad[] } {
  const marcas = marcasPago(tarea);
  const pasos: PasoActividad[] = [];
  if (marcas.aprobada) pasos.push({ id: "aprobada", estado: "hecho" });
  if (marcas.enviado) pasos.push({ id: "enviado", estado: "hecho" });
  if (marcas.pagado) pasos.push({ id: "pagado", estado: "hecho" });

  const pendienteSinPago = tarea.estado === "pendiente" && !marcas.enviado && !marcas.pagado;
  if (pendienteSinPago) return { pasos, eventos: [] };

  const eventos: EventoActividad[] = [];
  const enviada = instanteGuardado(tarea.enviadaEn);
  if (enviada) eventos.push({ id: "envio", en: enviada });
  const mileReviso =
    !tarea.revisionFallida &&
    (typeof tarea.nota === "number" || Boolean(tarea.veredicto) || tarea.etapa === "enviada_organizador" || marcas.aprobada);
  if (mileReviso) eventos.push({ id: "mile", en: null });
  if (marcas.aprobada) eventos.push({ id: "aprobada", en: null });
  if (marcas.enviado && !marcas.pagado) eventos.push({ id: "camino", en: null });
  if (marcas.pagado) eventos.push({ id: "pagado", en: null });
  return { pasos, eventos };
}
