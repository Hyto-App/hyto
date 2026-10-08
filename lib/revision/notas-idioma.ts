import type { Idioma } from "@/lib/ui/idioma";
import type { EtiquetaNota } from "./razones";

const FIJAS: Record<string, { texto: string; explicacion: string }> = {
  cap_otra: {
    texto: "Problema grave: no se ve el trabajo ni un recibo",
    explicacion: "La foto no es el trabajo pedido ni un recibo, así que la nota se queda en insuficiente.",
  },
  cap_no_coincide: {
    texto: "Problema grave: no coincide con lo pedido",
    explicacion: "La foto no coincide con lo pedido, así que la nota se queda en insuficiente.",
  },
  cap_sin_empezar: {
    texto: "Problema grave: el trabajo no empezó",
    explicacion: "El trabajo no empezó, así que la nota se queda en insuficiente.",
  },
  cap_otro_gasto: {
    texto: "Problema grave: es otro gasto",
    explicacion: "El gasto es de otro tipo, así que la nota se queda en insuficiente.",
  },
  cap_regla_evento: {
    texto: "Problema grave: no cumple la regla del evento",
    explicacion: "La foto no sigue una regla que la persona organizadora escribió para este evento, así que la nota se queda en insuficiente.",
  },
  cap_no_razonable: {
    texto: "No puede quedar completada: el gasto no es razonable",
    explicacion: "El gasto no es razonable para la tarea, así que la nota no puede llegar a completada.",
  },
  photo_unclear: {
    texto: "Foto borrosa o poco clara",
    explicacion: "La descripción dice que la foto está borrosa, oscura o es difícil de leer.",
  },
  selfie_or_empty: {
    texto: "Parece un selfie / no se ve el trabajo ni un recibo",
    explicacion: "La foto se clasificó como algo distinto del trabajo pedido o de un recibo.",
  },
  unclear_match: {
    texto: "No se puede confirmar la coincidencia",
    explicacion: "Las respuestas no dicen que esto sea lo pedido, y tampoco dicen que sea otra cosa.",
  },
  none_shown: {
    texto: "Faltan las partes pedidas",
    explicacion: "Las respuestas dicen que no se ve ninguna de las partes o detalles pedidos.",
  },
  part_missing: {
    texto: "Falta parte de lo pedido",
    explicacion: "Las respuestas dicen que falta parte de lo pedido o que solo se ve en parte.",
  },
  unfinished: {
    texto: "Trabajo sin terminar",
    explicacion: "Las respuestas dicen que el trabajo está a medias, o que algo quedó sin terminar o no se ve.",
  },
  wrong_place: {
    texto: "No se hizo en el lugar pedido",
    explicacion: "La descripción no dice que se haya hecho en el lugar pedido.",
  },
  no_item: {
    texto: "No nombra un artículo",
    explicacion: "Las respuestas del recibo no nombran un artículo.",
  },
  over_cap: {
    texto: "Monto sobre el límite",
    explicacion: "El monto supera el límite de la tarea, así que la nota no puede llegar a completada. Se puede pagar hasta el límite.",
  },
  low_detail: {
    texto: "Poco detalle",
    explicacion: "Dos o más respuestas no están claras o el modelo no estaba seguro, así que esta nota es menos segura.",
  },
  finished: {
    texto: "Terminado",
    explicacion: "Las respuestas dicen que el trabajo está terminado.",
  },
  amount_date: {
    texto: "Se encontró el monto y la fecha",
    explicacion: "Las respuestas del recibo y los datos guardados incluyen un monto y una fecha.",
  },
};

const POR_TEXTO: Record<string, { texto: string; explicacion: string }> = {
  "Receipt amount missing|The receipt answers do not give an amount.": {
    texto: "Falta el monto del recibo",
    explicacion: "Las respuestas del recibo no dan un monto.",
  },
  "Receipt amount missing|The saved receipt has no positive amount, so the grade stays at 40% or less.": {
    texto: "Falta el monto del recibo",
    explicacion: "El recibo guardado no tiene un monto mayor que cero, así que la nota se queda en 40% o menos.",
  },
  "Receipt date missing|The receipt answers do not give a date.": {
    texto: "Falta la fecha del recibo",
    explicacion: "Las respuestas del recibo no dan una fecha.",
  },
  "Receipt date missing|The saved receipt has no date, so the grade cannot reach Completed.": {
    texto: "Falta la fecha del recibo",
    explicacion: "El recibo guardado no tiene fecha, así que la nota no puede llegar a completada.",
  },
  "Matches the request|The answers say this is what was requested.": {
    texto: "Coincide con lo pedido",
    explicacion: "Las respuestas dicen que esto es lo pedido.",
  },
  "Matches the request|The answers say this expense is what was requested.": {
    texto: "Coincide con lo pedido",
    explicacion: "Las respuestas dicen que este gasto es lo pedido.",
  },
};

/** Shows a stored English tag in the session language. Unknown text stays as stored. */
export function presentarEtiqueta(etiqueta: EtiquetaNota, idioma: Idioma): EtiquetaNota {
  if (idioma !== "es") return etiqueta;
  const par = POR_TEXTO[`${etiqueta.texto}|${etiqueta.explicacion}`];
  if (par) return { ...etiqueta, ...par };
  const moneda = /^No rate for (.+)$/.exec(etiqueta.texto);
  if (etiqueta.id === "currency_unknown" && moneda) {
    const impreso = /total (.+) is in /.exec(etiqueta.explicacion)?.[1] ?? "";
    return {
      ...etiqueta,
      texto: `Sin tasa para ${moneda[1]}`,
      explicacion: `El total del recibo ${impreso} está en ${moneda[1]} y Hyto no tiene una tasa para esa moneda, así que no se pasó a dólares. La nota no puede llegar a completada. Revisa el monto antes de confirmarlo.`,
    };
  }
  if (etiqueta.id === "currency_unknown" && etiqueta.texto === "Currency not shown") {
    const impreso = /total (.+) shows no currency/.exec(etiqueta.explicacion)?.[1] ?? "";
    return {
      ...etiqueta,
      texto: "No se ve la moneda",
      explicacion: `El total del recibo ${impreso} no muestra la moneda, así que Hyto no supuso dólares ni lo convirtió. La nota no puede llegar a completada. Revisa el monto antes de confirmarlo.`,
    };
  }
  const impresa = /^The printed date (.+) could not be read as a calendar date/.exec(etiqueta.explicacion);
  if (etiqueta.id === "date_missing" && impresa) {
    return {
      ...etiqueta,
      texto: "Falta la fecha del recibo",
      explicacion: `La fecha impresa ${impresa[1]} no se pudo leer como fecha, así que la nota no puede llegar a completada.`,
    };
  }
  const fija = FIJAS[etiqueta.id];
  if (fija) return { ...etiqueta, ...fija };
  return etiqueta;
}
