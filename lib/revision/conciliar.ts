import type { TipoTarea } from "@/lib/integrante/tipos";
import type { Senales } from "./armar";
import { mileFaltantesGroqActivo, type EntornoFaltantesGroq } from "./faltantes-groq";
import type { RespuestasFactura, RespuestasTrabajo } from "./laya";
import type { LecturaEvidencia } from "./lectura";
import { lecturaCompleta } from "./lectura-completa";
import {
  motivosFactura,
  motivosTrabajo,
  notaDeFactura,
  notaDeTrabajo,
  notaEntera,
  PESOS_PREGUNTAS,
  type MotivoTope,
} from "./pesos";
import { escribirSnapshot, leerSnapshot } from "./snapshot-razones";

export type EntradaConciliar = {
  tipoTarea: TipoTarea;
  condicion: string;
  /** True when the evidence was a PDF, text list, or HTML read locally (no vision model). */
  textual: boolean;
  tope: string | null;
  /** US dollars read from the evidence. */
  monto: string | null;
  fecha: string | null;
};

/** Caps that come from Laya's work or invoice answers. Rule caps (regla_evento) are kept as they were. */
const MOTIVOS_DE_RESPUESTAS: readonly MotivoTope[] = ["no_coincide", "sin_empezar", "otro_gasto", "gasto_no_razonable"];

/**
 * Laya only reads the written description. When the evidence itself says something clearer, the answers
 * that contradict it are corrected before the grade and the tags are built, so the percentage, the tags,
 * and the stored snapshot say the same thing. Only while HYTO_MILE_FALTANTES_GROQ is on.
 *
 * Work, vision reading complete and coincide "si" (Groq saw the photo next to the request and lists nothing
 * missing): Laya's "something else", "unfinished", "something missing", and middle answers are text hedges.
 * They become the full answer. A "not started" answer is kept, and so is every rule cap.
 *
 * Work, a document read locally (list, PDF, text) that Laya calls the request, finished and with nothing
 * unfinished: the middle steps count in full, and the questions a document cannot answer (what action,
 * tools) are neutral.
 *
 * Invoice: the reading decides whether a date is printed. A missing date is named as a missing date, not
 * as an unreasonable expense, when the expense matches the request and is within the cap.
 */
export function conciliarConLectura(
  senales: Senales,
  lectura: LecturaEvidencia | null | undefined,
  entrada: EntradaConciliar,
  env: EntornoFaltantesGroq = process.env,
): Senales {
  if (!mileFaltantesGroqActivo(env)) return senales;
  if (!senales.detalle) return senales;
  const detalle = leerSnapshot(senales.detalle);
  if (!detalle) return senales;
  if (detalle.clase === "trabajo" && detalle.trabajo) {
    const ajuste = entrada.textual
      ? trabajoDeDocumento(detalle.trabajo)
      : lectura
        ? trabajoDeVision(detalle.trabajo, lectura)
        : null;
    if (!ajuste) return senales;
    const nota = notaEntera(notaDeTrabajo(ajuste.respuestas, entrada.condicion) + ajuste.extra);
    return {
      ...senales,
      score: String(nota),
      noul: nota === 100,
      motivos: unirMotivos(senales.motivos, motivosTrabajo(ajuste.respuestas).filter((motivo) => motivo !== "no_coincide")),
      detalle: escribirSnapshot({ ...detalle, trabajo: ajuste.respuestas }),
    };
  }
  if (detalle.clase === "factura" && detalle.factura && lectura) {
    const respuestas = facturaConLectura(detalle.factura, lectura, entrada);
    if (!respuestas) return senales;
    const nota = notaDeFactura(respuestas);
    return {
      ...senales,
      score: String(nota),
      noul: nota === 100,
      motivos: unirMotivos(senales.motivos, motivosFactura(respuestas)),
      detalle: escribirSnapshot({ ...detalle, factura: respuestas }),
    };
  }
  return senales;
}

function trabajoDeVision(
  trabajo: RespuestasTrabajo,
  lectura: LecturaEvidencia,
): { respuestas: RespuestasTrabajo; extra: number } | null {
  if (!lecturaCompleta(lectura) || lectura.coincide !== "si") return null;
  if (trabajo.t6 === "sin_empezar") return null;
  const respuestas: RespuestasTrabajo = {
    ...trabajo,
    v1: "es_lo_pedido",
    v2: 2,
    v4: false,
    t6: trabajo.t6 === "a_medias" || trabajo.t6 === "no_claro" ? "terminado" : trabajo.t6,
    t9: false,
    t10: 2,
  };
  return mismo(trabajo, respuestas) ? null : { respuestas, extra: 0 };
}

function trabajoDeDocumento(trabajo: RespuestasTrabajo): { respuestas: RespuestasTrabajo; extra: number } | null {
  if (trabajo.v1 !== "es_lo_pedido") return null;
  if (trabajo.t6 !== "terminado" && trabajo.t6 !== "no_aplica") return null;
  if (trabajo.t9 || trabajo.v2 === 0 || trabajo.t10 === 0) return null;
  const respuestas: RespuestasTrabajo = { ...trabajo, v2: 2, t10: 2 };
  const peso = PESOS_PREGUNTAS.trabajo;
  // A list or a document shows no action and no tools. Those answers are neutral, not a miss.
  const extra = (trabajo.t5 === "otra_o_no_claro" ? peso.t5 : 0) + (trabajo.t7 ? 0 : peso.t7);
  if (mismo(trabajo, respuestas) && extra === 0) return null;
  return { respuestas, extra };
}

function facturaConLectura(
  factura: RespuestasFactura,
  lectura: LecturaEvidencia,
  entrada: EntradaConciliar,
): RespuestasFactura | null {
  let respuestas = factura;
  const sinFecha = !lectura.fecha && !lectura.fechaImpresa && !entrada.fecha;
  if (respuestas.f3 && sinFecha) respuestas = { ...respuestas, f3: false };
  const monto = centavos(entrada.monto ?? lectura.montoUsd);
  const tope = centavos(entrada.tope);
  const dentroDelTope = monto > 0 && (tope <= 0 || monto <= tope);
  const coincide = lectura.coincide !== "no" && lectura.coincide !== "parcial";
  if (
    !respuestas.g2 &&
    respuestas.f1 === "coincide_con_lo_pedido" &&
    dentroDelTope &&
    coincide &&
    (sinFecha || lectura.coincide === "si")
  ) {
    respuestas = { ...respuestas, g2: true };
  }
  return respuestas === factura ? null : respuestas;
}

function unirMotivos(previos: readonly MotivoTope[] | undefined, nuevos: readonly MotivoTope[]): MotivoTope[] | undefined {
  const motivos = (previos ?? []).filter((motivo) => !MOTIVOS_DE_RESPUESTAS.includes(motivo));
  for (const motivo of nuevos) if (!motivos.includes(motivo)) motivos.push(motivo);
  return motivos.length > 0 ? motivos : undefined;
}

function mismo(a: RespuestasTrabajo, b: RespuestasTrabajo): boolean {
  return (Object.keys(a) as Array<keyof RespuestasTrabajo>).every((clave) => a[clave] === b[clave]);
}

function centavos(valor: string | null | undefined): number {
  const texto = (valor ?? "").trim();
  if (!/^\d+([.,]\d{1,2})?$/.test(texto)) return 0;
  const [entero, fraccion = ""] = texto.replace(",", ".").split(".");
  return Number(entero) * 100 + Number((fraccion + "00").slice(0, 2));
}
