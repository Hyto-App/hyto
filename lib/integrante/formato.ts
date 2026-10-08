import { detalleMonto, normalizarMonto } from "@/lib/admin/vista";
import type { TareaAdmin } from "@/lib/admin/tipos";
import { cifraConfirmada, montoDentroDelTope } from "@/lib/escrow/monto";
import type { Idioma } from "@/lib/ui/idioma";

function localeDe(idioma: Idioma): string {
  return idioma === "es" ? "es-CR" : "en-US";
}

export function formatearMonto(monto: string, idioma: Idioma = "en"): string {
  const limpio = monto.trim();
  if (!limpio) return "";
  const valor = Number(limpio);
  if (!Number.isFinite(valor)) return monto;
  const decimales = Number.isInteger(valor) ? 0 : 2;
  return `US$${valor.toLocaleString(localeDe(idioma), {
    minimumFractionDigits: decimales,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Net received, without rounding away the extra decimals.
 * US$2 set aside arrives as US$1.994. A whole number stays whole.
 */
export function formatearRecibido(monto: string, idioma: Idioma = "en"): string {
  const limpio = monto.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,7})?$/.test(limpio)) return formatearMonto(monto, idioma);
  const [entera, fraccion = ""] = limpio.split(".");
  const miles = idioma === "es" ? "." : ",";
  const grupo = entera.replace(/\B(?=(\d{3})+(?!\d))/g, miles);
  const recortada = fraccion.replace(/0+$/, "");
  if (!recortada) return `US$${grupo}`;
  const visible = recortada.length === 1 ? `${recortada}0` : recortada;
  const separador = idioma === "es" ? "," : ".";
  return `US$${grupo}${separador}${visible}`;
}

function fechaDeCalendario(anio: number, mes: number, dia: number, idioma: Idioma = "en"): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, 12));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(fecha);
}

/** Costa Rica does not observe daylight saving, so this stays UTC−6 all year. */
export const ZONA_HORA = "America/Costa_Rica";

export function formatearHora(iso: string | Date, idioma: "en" | "es"): string | null {
  const fecha = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return new Intl.DateTimeFormat(idioma === "es" ? "es-CR" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ZONA_HORA,
  }).format(fecha);
}

export function formatearFecha(iso: string, idioma: Idioma = "en"): string {
  const limpio = iso.trim();
  const calendario = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?(?:[zZ]|[+-]00:?00))?$/.exec(limpio);
  if (calendario) {
    const texto = fechaDeCalendario(Number(calendario[1]), Number(calendario[2]), Number(calendario[3]), idioma);
    if (texto) return texto;
    return iso;
  }
  const fecha = new Date(limpio);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat(localeDe(idioma), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: ZONA_HORA,
  }).format(fecha);
}

export function acortarDireccion(direccion: string): string {
  if (direccion.length < 12) return direccion;
  return `${direccion.slice(0, 6)}…${direccion.slice(-4)}`;
}

export function montoDeTarea(
  tarea: { tipo: "trabajo" | "reembolso"; monto: string; tope: string | null },
  idioma: Idioma = "en",
): string {
  if (tarea.tipo === "reembolso") {
    const tope = formatearMonto(tarea.tope ?? tarea.monto, idioma);
    if (!tope) return "";
    return idioma === "es" ? `Hasta ${tope}` : `Up to ${tope}`;
  }
  return formatearMonto(tarea.monto, idioma);
}

/**
 * Amount the lock sentence and the confirm dialog must share.
 * A confirmed reimbursement is that figure. Before confirmation the cap stays lowercase ("up to" / "hasta").
 */
export function montoQueAparta(
  tarea: { tipo: "trabajo" | "reembolso"; monto: string; tope: string | null; montoConfirmado?: string | null },
  idioma: Idioma = "en",
): string {
  if (tarea.tipo === "reembolso") {
    const normal = normalizarMonto(tarea.montoConfirmado ?? "");
    const cifra = normal ? cifraConfirmada(normal, tarea.tope, tarea.monto) : null;
    if (cifra !== null) return formatearMonto(String(cifra), idioma);
    const tope = formatearMonto(tarea.tope ?? tarea.monto, idioma);
    if (!tope) return "";
    return idioma === "es" ? `hasta ${tope}` : `up to ${tope}`;
  }
  const normal = normalizarMonto(tarea.monto);
  return normal ? formatearMonto(normal, idioma) : "";
}

/**
 * What Mile read, and the milestone that can be paid (confirmed amount, or the reading inside the cap).
 * This is not the net after the protocol fee.
 */
export function montosDeCobro(
  tarea: {
    tipo: "trabajo" | "reembolso";
    monto: string;
    tope: string | null;
    montoConfirmado?: string | null;
    montoRevisado?: string | null;
  },
  idioma: Idioma = "en",
): { leido: string; pago: string } | null {
  const leidoNormal = normalizarMonto(tarea.montoRevisado ?? "");
  const leido = leidoNormal ? formatearMonto(leidoNormal, idioma) : "";
  if (!leido) return null;
  let pagoNormal: string | null = null;
  if (tarea.tipo === "reembolso") {
    const confirmado = normalizarMonto(tarea.montoConfirmado ?? "");
    if (confirmado && cifraConfirmada(confirmado, tarea.tope, tarea.monto) !== null) pagoNormal = confirmado;
    else pagoNormal = montoDentroDelTope(leidoNormal ?? "", tarea.tope, tarea.monto);
  } else {
    pagoNormal = normalizarMonto(tarea.monto);
  }
  const pago = pagoNormal ? formatearMonto(pagoNormal, idioma) : leido;
  return { leido, pago };
}

/** Amount locked in the escrow, without the "up to" cap label. */
export function montoAsegurado(
  tarea: { tipo: "trabajo" | "reembolso"; monto: string; tope: string | null; montoConfirmado?: string | null },
  idioma: Idioma = "en",
): string {
  if (tarea.tipo === "reembolso") {
    const normal = normalizarMonto(tarea.montoConfirmado ?? "");
    if (normal && cifraConfirmada(normal, tarea.tope, tarea.monto) !== null) return formatearMonto(normal, idioma);
    return montoDeTarea(tarea, idioma);
  }
  const normal = normalizarMonto(tarea.monto);
  return normal ? formatearMonto(normal, idioma) : "";
}

type MontoLista = {
  estado?: string;
  tipo: "trabajo" | "reembolso";
  monto: string;
  tope: string | null;
  montoConfirmado?: string | null;
  montoRevisado?: string | null;
};

/**
 * Amount on an event task row. A paid task shows what was paid.
 * A reimbursement that paid less than its cap also shows that cap.
 */
export function lineaMontoTarea(
  tarea: MontoLista,
  idioma: Idioma = "en",
  etiquetaLimite?: (monto: string) => string,
): string {
  if (tarea.estado !== "pagado") return montoDeTarea(tarea, idioma);
  const detalle = detalleMonto({
    tipo: tarea.tipo,
    monto: tarea.monto,
    tope: tarea.tope,
    estado: "pagado",
    montoConfirmado: tarea.montoConfirmado ?? null,
    montoRevisado: tarea.montoRevisado ?? null,
  } as TareaAdmin);
  const cifra = formatearMonto(detalle.cifra, idioma);
  if (!cifra) return montoDeTarea(tarea, idioma);
  const limite = detalle.tope && detalle.tope !== detalle.cifra ? formatearMonto(detalle.tope, idioma) : "";
  if (limite && etiquetaLimite) return `${cifra} · ${etiquetaLimite(limite)}`;
  return cifra;
}
