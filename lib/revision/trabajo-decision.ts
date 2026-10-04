import { compararFechaPedido } from "./recibo-parser";
import { leerFechaTrabajo, quitarFechas, type LecturaFecha } from "./trabajo-fechas";
import type { RespuestaTrabajo } from "./trabajo-preguntas";

export type RespuestasDecisionTrabajo = {
  trabajoVisible: RespuestaTrabajo;
  fotoDeTrabajo: RespuestaTrabajo;
  esElPedido: RespuestaTrabajo;
  lugar: RespuestaTrabajo;
  lugarPedido: RespuestaTrabajo;
  cantidad: RespuestaTrabajo;
  cantidadPedido: RespuestaTrabajo;
  progreso: RespuestaTrabajo;
  fechaHora: RespuestaTrabajo;
  fechaPedido: RespuestaTrabajo;
};

export type ProgresoTrabajo = "terminado" | "parcial" | "sin_empezar";

export type DatosDecisionTrabajo = {
  work: string | null;
  place: string | null;
  quantityRaw: string | null;
  progress: ProgresoTrabajo | null;
  dateRaw: string | null;
  dateIso: string | null;
  pedido: string;
  /** Default es-CR when omitted. See leerFechaTrabajo. */
  locale?: string | null;
};

export type EntradaDecisionTrabajo = {
  respuestas: RespuestasDecisionTrabajo;
  datos: DatosDecisionTrabajo;
  /** Accepted and ignored. This path does not apply a grade cap or a payment cap. */
  tope?: string | null;
};

export type ResultadoDecision = "ok" | "needs_clarification" | "rechazo_duro";

export type DecisionTrabajo = {
  resultado: ResultadoDecision;
  /** Always null. Unclear data does not become 49 or 40. */
  nota: null;
  motivos: string[];
  tope: string | null;
};

const PALABRAS: Record<string, number> = {
  un: 1,
  una: 1,
  one: 1,
  dos: 2,
  two: 2,
  tres: 3,
  three: 3,
  cuatro: 4,
  four: 4,
  cinco: 5,
  five: 5,
  seis: 6,
  six: 6,
  siete: 7,
  seven: 7,
  ocho: 8,
  eight: 8,
  nueve: 9,
  nine: 9,
  diez: 10,
  ten: 10,
  once: 11,
  eleven: 11,
  doce: 12,
  twelve: 12,
};

/**
 * Missing or unclear data asks for clarification.
 * A hard reject happens only when a present fact contradicts the request:
 * the photo is not the work, the named task differs, the named place differs,
 * a single stated count differs, every reading of the date differs, or the
 * description says the work has not started (unless the request asks for that).
 * A partial count that is not a single number on both sides is not a hard reject.
 */
export function decidirTrabajo(entrada: EntradaDecisionTrabajo): DecisionTrabajo {
  const fecha = lecturaFecha(entrada.datos);
  const base = { nota: null, tope: entrada.tope ?? null };
  const duros: string[] = [];
  if (entrada.respuestas.fotoDeTrabajo === "no") duros.push("no_es_trabajo");
  if (texto(entrada.datos.work) && entrada.respuestas.esElPedido === "no") duros.push("trabajo_distinto");
  if (texto(entrada.datos.place) && entrada.respuestas.lugarPedido === "no") duros.push("lugar_distinto");
  if (cantidadContradice(entrada.datos.pedido, entrada.datos.quantityRaw)) duros.push("cantidad_distinta");
  if (fechaContradice(entrada.datos.pedido, fecha)) duros.push("fecha_distinta");
  if (entrada.datos.progress === "sin_empezar" && !pideSinEmpezar(entrada.datos.pedido)) duros.push("sin_empezar");
  if (duros.length > 0) return { resultado: "rechazo_duro", motivos: duros, ...base };

  const aclarar: string[] = [];
  if (entrada.respuestas.fotoDeTrabajo !== "yes") aclarar.push("foto");
  if (entrada.respuestas.trabajoVisible !== "yes" || !texto(entrada.datos.work)) aclarar.push("trabajo");
  if (entrada.respuestas.esElPedido !== "yes") aclarar.push("pedido");
  if (entrada.respuestas.lugar !== "yes" || !texto(entrada.datos.place)) aclarar.push("lugar");
  if (entrada.respuestas.lugarPedido !== "yes") aclarar.push("lugar_pedido");
  if (entrada.respuestas.cantidad !== "yes" || cantidadesExplicitas(entrada.datos.quantityRaw ?? "").length !== 1) {
    aclarar.push("cantidad");
  }
  if (entrada.respuestas.cantidadPedido !== "yes" || !cantidadCoincide(entrada.datos.pedido, entrada.datos.quantityRaw)) {
    aclarar.push("cantidad_pedido");
  }
  if (entrada.respuestas.progreso !== "yes" || entrada.datos.progress !== "terminado") aclarar.push("progreso");
  if (entrada.respuestas.fechaHora !== "yes" || !fecha.elegida) aclarar.push("fecha");
  if (entrada.respuestas.fechaPedido !== "yes" || !fecha.elegida || compararFechaPedido(entrada.datos.pedido, fecha.elegida) !== "coincide") {
    aclarar.push("fecha_pedido");
  }
  if (fecha.ambigua && fecha.regla !== "pedido") aclarar.push("fecha_ambigua");
  if (aclarar.length > 0) return { resultado: "needs_clarification", motivos: aclarar, ...base };
  return { resultado: "ok", motivos: [], ...base };
}

export function cantidadesExplicitas(texto: string): number[] {
  const limpio = quitarFechas(texto);
  const numeros = new Set<number>();
  for (const match of limpio.matchAll(/\b(\d{1,3})\b/g)) {
    const valor = Number(match[1]);
    if (valor >= 1 && valor <= 100) numeros.add(valor);
  }
  for (const [palabra, valor] of Object.entries(PALABRAS)) {
    if (new RegExp(`\\b${palabra}\\b`).test(limpio)) numeros.add(valor);
  }
  return [...numeros].sort((a, b) => a - b);
}

function lecturaFecha(datos: DatosDecisionTrabajo): LecturaFecha {
  const crudo = datos.dateRaw?.trim() || datos.dateIso?.trim() || "";
  if (!crudo) return leerFechaTrabajo("");
  return leerFechaTrabajo(crudo, { pedido: datos.pedido, locale: datos.locale ?? "es-CR" });
}

function fechaContradice(pedido: string, lectura: LecturaFecha): boolean {
  if (lectura.interpretaciones.length === 0) return false;
  return lectura.interpretaciones.every((iso) => compararFechaPedido(pedido, iso) === "no_coincide");
}

function cantidadContradice(pedido: string, quantityRaw: string | null): boolean {
  if (!quantityRaw?.trim()) return false;
  const hecha = cantidadesExplicitas(quantityRaw);
  const pedida = cantidadesExplicitas(pedido);
  if (hecha.length !== 1 || pedida.length !== 1) return false;
  return hecha[0] !== pedida[0];
}

function cantidadCoincide(pedido: string, quantityRaw: string | null): boolean {
  if (!quantityRaw?.trim()) return false;
  const hecha = cantidadesExplicitas(quantityRaw);
  const pedida = cantidadesExplicitas(pedido);
  if (hecha.length !== 1 || pedida.length !== 1) return false;
  return hecha[0] === pedida[0];
}

function pideSinEmpezar(pedido: string): boolean {
  const plano = pedido.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return /\bsin empezar\b/.test(plano) || /\bnot started\b/.test(plano);
}

function texto(valor: string | null): boolean {
  return Boolean(valor?.trim());
}
