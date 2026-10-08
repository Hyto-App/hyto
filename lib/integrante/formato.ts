import { centavos, detalleMonto, normalizarMonto, textoMonto } from "@/lib/admin/vista";
import type { TareaAdmin } from "@/lib/admin/tipos";
import { cifraConfirmada, montoDentroDelTope } from "@/lib/escrow/monto";
import { brutoDeNeto, brutoFondado, netoEnCentavos, type NetoEnCentavos } from "@/lib/escrow/recibido";
import { texto } from "@/lib/ui/diccionario";
import type { Idioma } from "@/lib/ui/idioma";

function localeDe(idioma: Idioma): string {
  return idioma === "es" ? "es-CR" : "en-US";
}

export function formatearMonto(monto: string, idioma: Idioma = "en"): string {
  return montoLocal(monto, idioma, null);
}

/**
 * Balance notices always show cents (`US$1.00`, `US$6,00`).
 * `formatearMonto` drops the cents of a whole dollar, which those sentences do not.
 */
export function formatearCentavos(monto: string, idioma: Idioma = "en"): string {
  return montoLocal(monto, idioma, 2);
}

export function textosSaldo(
  falta: { necesario: string; reserva: string; falta: string },
  idioma: Idioma = "en",
): { n: string; reserva: string; falta: string } {
  return {
    n: formatearCentavos(falta.necesario, idioma),
    reserva: formatearCentavos(falta.reserva, idioma),
    falta: formatearCentavos(falta.falta, idioma),
  };
}

function montoLocal(monto: string, idioma: Idioma, centavosFijos: number | null): string {
  const limpio = monto.trim();
  if (!limpio) return "";
  const valor = Number(limpio);
  if (!Number.isFinite(valor)) return monto;
  const decimales = centavosFijos ?? (Number.isInteger(valor) ? 0 : 2);
  return `US$${valor.toLocaleString(localeDe(idioma), {
    minimumFractionDigits: decimales,
    maximumFractionDigits: centavosFijos ?? 2,
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

type PagoVisible = {
  tipo: "trabajo" | "reembolso";
  monto: string;
  tope: string | null;
  montoConfirmado?: string | null;
  montoPagado?: string | null;
};

function partesDePago(tarea: PagoVisible): NetoEnCentavos | null {
  const bruto =
    brutoFondado(tarea, tarea.montoConfirmado) ?? (tarea.montoPagado ? brutoDeNeto(tarea.montoPagado) : null);
  return bruto ? netoEnCentavos(bruto) : null;
}

/** Rounded net, and the same net with the fee written out when it changes the cents. */
export function explicarPago(tarea: PagoVisible, idioma: Idioma = "en"): { corto: string; frase: string } | null {
  const partes = partesDePago(tarea);
  if (!partes) return null;
  const corto = formatearMonto(partes.neto, idioma);
  if (!corto) return null;
  if (partes.comision === "0") return { corto, frase: corto };
  return {
    corto,
    frase: texto(idioma, "revision.netoExplicado", {
      neto: corto,
      bruto: formatearMonto(partes.bruto, idioma),
      comision: formatearMonto(partes.comision, idioma),
    }),
  };
}

/**
 * Paid total for the My tasks header. Adds the cent net each paid card shows, like the account
 * total (`armarOrgullo`): nets of 12.44256, 1.994 and 1.994 add up to US$16.42, not US$16.43.
 */
export function totalGanado(tareas: readonly (PagoVisible & { estado: string })[], idioma: Idioma = "en"): string {
  let total = 0;
  for (const tarea of tareas) {
    if (tarea.estado !== "pagado") continue;
    const partes = partesDePago(tarea);
    if (partes) total += centavos(partes.neto);
  }
  return formatearMonto(textoMonto(total), idioma);
}

/** A stored net such as 12.44256, explained from the cent amount that was funded. */
export function explicarNeto(neto: string, idioma: Idioma = "en"): string {
  const bruto = brutoDeNeto(neto);
  if (!bruto) return formatearRecibido(neto, idioma);
  return explicarPago({ tipo: "trabajo", monto: bruto, tope: null }, idioma)?.frase || formatearRecibido(neto, idioma);
}

type MontoLista = {
  estado?: string;
  tipo: "trabajo" | "reembolso";
  monto: string;
  tope: string | null;
  montoConfirmado?: string | null;
  montoRevisado?: string | null;
};

export type VistaMonto = {
  /** Amount that will be paid, when it is known and is not the cap itself. */
  pago: string | null;
  /** Reimbursement cap, already formatted. */
  tope: string | null;
  /** One line for a list or a chip. */
  linea: string;
  /** `linea` split at " · ", for a layout that may only wrap there. */
  partes: string[];
};

/**
 * A reimbursement can show a cap ("Up to US$50") and a smaller amount to pay.
 * When both exist and they differ, the line names each one.
 */
export function vistaMonto(
  tarea: MontoLista,
  idioma: Idioma = "en",
  etiquetaLimite?: (monto: string) => string,
): VistaMonto {
  if (tarea.tipo !== "reembolso") {
    const linea = formatearMonto(tarea.monto, idioma);
    return { pago: null, tope: null, linea, partes: [linea] };
  }
  const tope = formatearMonto(tarea.tope ?? tarea.monto, idioma);
  const pago = pagoDistintoDelTope(tarea, idioma, tope);
  if (pago && tope) {
    const limite = etiquetaLimite ? etiquetaLimite(tope) : texto(idioma, "eventos.limit", { amount: tope });
    const partes = [`${texto(idioma, "revision.amountToPay")} ${pago}`, limite];
    return { pago, tope, linea: partes.join(" · "), partes };
  }
  const linea = montoDeTarea(tarea, idioma);
  return { pago: null, tope: tope || null, linea, partes: [linea] };
}

function pagoDistintoDelTope(tarea: MontoLista, idioma: Idioma, tope: string): string | null {
  const confirmado = normalizarMonto(tarea.montoConfirmado ?? "");
  const pago =
    confirmado && cifraConfirmada(confirmado, tarea.tope, tarea.monto) !== null
      ? formatearMonto(confirmado, idioma)
      : (montosDeCobro(tarea, idioma)?.pago ?? null);
  if (!pago || !tope || pago === tope) return null;
  return pago;
}

/**
 * Amount on an event task row. A paid task shows the net and the fee.
 * Every paid task also shows its limit, whether or not the payment used the whole cap.
 */
export function lineaMontoTarea(
  tarea: MontoLista,
  idioma: Idioma = "en",
  etiquetaLimite?: (monto: string) => string,
): string {
  if (tarea.estado !== "pagado") return vistaMonto(tarea, idioma, etiquetaLimite).linea;
  const detalle = detalleMonto({
    tipo: tarea.tipo,
    monto: tarea.monto,
    tope: tarea.tope,
    estado: "pagado",
    montoConfirmado: tarea.montoConfirmado ?? null,
    montoRevisado: tarea.montoRevisado ?? null,
  } as TareaAdmin);
  const confirmado = tarea.tipo === "reembolso" ? (tarea.montoConfirmado ?? detalle.cifra) : null;
  const pago = explicarPago({ ...tarea, montoConfirmado: confirmado }, idioma);
  const cifra = pago?.frase || formatearMonto(detalle.cifra, idioma);
  if (!cifra) return montoDeTarea(tarea, idioma);
  const tope = tarea.tipo === "reembolso" ? (tarea.tope || tarea.monto) : tarea.monto;
  const limite = tope ? formatearMonto(tope, idioma) : "";
  if (limite && etiquetaLimite) return `${cifra} · ${etiquetaLimite(limite)}`;
  return cifra;
}
