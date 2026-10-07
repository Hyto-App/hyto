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

function conHash(tarea: TareaActividad): boolean {
  return Boolean(tarea.hashPago?.trim());
}

/**
 * Payment trail from fields the task already carries.
 * Aprobada: the task is closed (paid, or the payment was already sent).
 * Pago enviado: a payment hash is stored, or the task is already paid.
 * Pagado: estado pagado.
 */
export function marcasPago(tarea: TareaActividad): { aprobada: boolean; enviado: boolean; pagado: boolean } {
  const pagado = tarea.estado === "pagado";
  const enviado = pagado || conHash(tarea);
  const aprobada = enviado || tarea.etapa === "aprobada";
  return { aprobada, enviado, pagado };
}

export function seguimientoDe(tarea: TareaActividad): { pasos: PasoActividad[]; eventos: EventoActividad[] } {
  const marcas = marcasPago(tarea);
  const empezo = Boolean(instanteGuardado(tarea.enviadaEn) || tarea.etapa || tarea.estado !== "pendiente" || marcas.enviado);
  const pasos: PasoActividad[] = [
    { id: "aprobada", estado: marcas.aprobada ? "hecho" : empezo ? "ahora" : "despues" },
    { id: "enviado", estado: marcas.enviado ? "hecho" : marcas.aprobada ? "ahora" : "despues" },
    { id: "pagado", estado: marcas.pagado ? "hecho" : marcas.enviado ? "ahora" : "despues" },
  ];

  const eventos: EventoActividad[] = [];
  const enviada = instanteGuardado(tarea.enviadaEn);
  if (enviada || tarea.etapa) eventos.push({ id: "envio", en: enviada });
  const mileReviso =
    !tarea.revisionFallida &&
    (typeof tarea.nota === "number" || Boolean(tarea.veredicto) || tarea.etapa === "enviada_organizador" || marcas.aprobada);
  if (mileReviso) eventos.push({ id: "mile", en: null });
  if (marcas.aprobada) eventos.push({ id: "aprobada", en: null });
  if (marcas.enviado) eventos.push({ id: "camino", en: null });
  if (marcas.pagado) eventos.push({ id: "pagado", en: null });
  return { pasos, eventos };
}
