import type { Idioma } from "@/lib/ui/idioma";
import { texto } from "@/lib/ui/diccionario";
import { INTENTOS_MILE_DEFECTO } from "./requisitos-bandera";

/** A task stores at most three photo requirements. Empty keeps condicion. */
export const MAX_REQUISITOS = 3;
const TEXTO_MAX = 180;
const NOTA_MAX = 280;

export type EstadoRequisito = "cumple" | "parcial" | "no_cumple";
export type OrigenRechazo = "mile" | "organizador";

export type RequisitoTarea = {
  id: string;
  texto: string;
};

export type ResultadoRequisito = {
  id: string;
  texto: string;
  estado: EstadoRequisito;
  observacion: string;
};

export type AccionMile = "seguir" | "rechazar";

/**
 * A requirement fails only when its estado is no_cumple.
 * parcial stays with the organizer. Mile never pays.
 * intento is how many photos this task already has, including the one just saved.
 * intento < max sends the task back. At the cap the organizer decides.
 */
export type DecisionRequisitos = {
  resultados: ResultadoRequisito[];
  puntaje: number;
  notaMile: string;
  accion: AccionMile;
  fallidos: string[];
};

export type RechazoGuardado = {
  nota: string | null;
  fallidos: string[];
  en: string;
  origen: OrigenRechazo;
  intento: number;
  puntaje: number | null;
  notaMile: string | null;
  resultados: ResultadoRequisito[];
};

const ESTADOS: EstadoRequisito[] = ["cumple", "parcial", "no_cumple"];
const PESO: Record<EstadoRequisito, number> = { cumple: 100, parcial: 50, no_cumple: 0 };

export function leerRequisitos(valor: unknown): RequisitoTarea[] {
  const crudo = valorJson(valor);
  if (!Array.isArray(crudo)) return [];
  const usados = new Set<string>();
  const salida: RequisitoTarea[] = [];
  for (const item of crudo) {
    const textoItem = textoDeItem(item);
    if (!textoItem) continue;
    const id = idDeItem(item, usados, salida.length);
    usados.add(id);
    salida.push({ id, texto: textoItem });
    if (salida.length === MAX_REQUISITOS) break;
  }
  return salida;
}

export function serializarRequisitos(requisitos: RequisitoTarea[]): string | null {
  if (requisitos.length === 0) return null;
  return JSON.stringify(requisitos.map((requisito) => ({ id: requisito.id, texto: requisito.texto })));
}

/** Organizer input. A string is the text. An object may carry id and texto. */
export function entradaRequisitos(valor: unknown): { ok: true; requisitos: RequisitoTarea[] } | { ok: false; aviso: string } {
  if (valor == null) return { ok: true, requisitos: [] };
  if (!Array.isArray(valor)) return { ok: false, aviso: "Requirements have to be a list." };
  if (valor.length > MAX_REQUISITOS) return { ok: false, aviso: "Enter at most 3 requirements." };
  const usados = new Set<string>();
  const salida: RequisitoTarea[] = [];
  for (const item of valor) {
    const textoItem = textoDeItem(item);
    if (!textoItem) continue;
    const id = idDeItem(item, usados, salida.length);
    usados.add(id);
    salida.push({ id, texto: textoItem });
  }
  return { ok: true, requisitos: salida };
}

export function estadoDeNivel(nivel: 0 | 1 | 2): EstadoRequisito {
  if (nivel === 2) return "cumple";
  if (nivel === 1) return "parcial";
  return "no_cumple";
}

export function decidirRequisitos(entrada: {
  requisitos: RequisitoTarea[];
  niveles: ReadonlyArray<0 | 1 | 2 | null>;
  idioma: Idioma;
  intento: number;
  maxIntentos?: number;
}): DecisionRequisitos | null {
  const requisitos = entrada.requisitos.slice(0, MAX_REQUISITOS);
  if (requisitos.length === 0 || entrada.niveles.length < requisitos.length) return null;
  const resultados: ResultadoRequisito[] = [];
  for (let indice = 0; indice < requisitos.length; indice += 1) {
    const nivel = entrada.niveles[indice];
    if (nivel !== 0 && nivel !== 1 && nivel !== 2) return null;
    const requisito = requisitos[indice];
    if (!requisito) return null;
    const estado = estadoDeNivel(nivel);
    resultados.push({
      id: requisito.id,
      texto: requisito.texto,
      estado,
      observacion: texto(entrada.idioma, claveEstado(estado)),
    });
  }
  const puntaje = Math.round(resultados.reduce((suma, item) => suma + PESO[item.estado], 0) / resultados.length);
  const fallidos = resultados.filter((item) => item.estado === "no_cumple").map((item) => item.id);
  const maximo = entrada.maxIntentos ?? INTENTOS_MILE_DEFECTO;
  const intento = Number.isInteger(entrada.intento) && entrada.intento > 0 ? entrada.intento : 1;
  const falla = fallidos.length > 0;
  const rechazar = falla && intento < maximo;
  const hayParcial = resultados.some((item) => item.estado === "parcial");
  const notaMile = texto(
    entrada.idioma,
    rechazar ? "mile.notaRechazo" : falla ? "mile.notaTope" : hayParcial ? "mile.notaParcial" : "mile.notaSigue",
  );
  return {
    resultados,
    puntaje,
    notaMile,
    accion: rechazar ? "rechazar" : "seguir",
    fallidos,
  };
}

/** Organizer ask for another photo. An empty note still counts, so the member can see the ask. */
export function rechazoDeOrganizador(pedido: unknown, ahora: string): RechazoGuardado {
  const raiz = objeto(pedido);
  const anidado = objeto(raiz?.rechazo);
  const nota = sanear(anidado?.nota ?? raiz?.nota, NOTA_MAX);
  const fallidos = idsDe(anidado?.fallidos ?? raiz?.fallidos).slice(0, MAX_REQUISITOS);
  const marca = typeof ahora === "string" ? ahora.trim().slice(0, 40) : "";
  return {
    nota,
    fallidos,
    en: marca || new Date(0).toISOString(),
    origen: "organizador",
    intento: 1,
    puntaje: null,
    notaMile: null,
    resultados: [],
  };
}

export function rechazoDeDecision(decision: DecisionRequisitos, intento: number, ahora: string): RechazoGuardado | null {
  if (decision.accion !== "rechazar") return null;
  return {
    nota: decision.notaMile,
    fallidos: decision.fallidos,
    en: ahora,
    origen: "mile",
    intento,
    puntaje: decision.puntaje,
    notaMile: decision.notaMile,
    resultados: decision.resultados,
  };
}

export function serializarRechazo(rechazo: RechazoGuardado | null): string | null {
  if (!rechazo) return null;
  return JSON.stringify({
    nota: rechazo.nota,
    fallidos: rechazo.fallidos,
    en: rechazo.en,
    origen: rechazo.origen,
    intento: rechazo.intento,
    puntaje: rechazo.puntaje,
    nota_mile: rechazo.notaMile,
    resultados: rechazo.resultados,
  });
}

export function leerRechazo(valor: unknown): RechazoGuardado | null {
  const crudo = objeto(valorJson(valor));
  if (!crudo) return null;
  const origen: OrigenRechazo | null = crudo.origen === "mile" || crudo.origen === "organizador" ? crudo.origen : null;
  const fallidos = idsDe(crudo.fallidos);
  const nota = sanear(crudo.nota, NOTA_MAX);
  const en = typeof crudo.en === "string" && crudo.en.trim() ? crudo.en.trim().slice(0, 40) : "";
  if (!origen && fallidos.length === 0 && !nota && !en) return null;
  const notaMile = sanear(crudo.nota_mile ?? crudo.notaMile, NOTA_MAX);
  const puntaje = puntajeDe(crudo.puntaje);
  return {
    nota,
    fallidos,
    en,
    origen: origen ?? "organizador",
    intento: intentoDe(crudo.intento),
    puntaje,
    notaMile,
    resultados: resultadosDe(crudo.resultados),
  };
}

export function observacionDe(estado: EstadoRequisito, idioma: Idioma): string {
  return texto(idioma, claveEstado(estado));
}

export type RevisionMile = {
  puntaje: number;
  notaMile: string;
  resultados: ResultadoRequisito[];
};

export function serializarRevisionMile(revision: RevisionMile): string {
  return JSON.stringify({
    puntaje: revision.puntaje,
    nota_mile: revision.notaMile,
    resultados: revision.resultados,
  });
}

export function leerRevisionMile(valor: unknown): RevisionMile | null {
  const crudo = objeto(valorJson(valor));
  if (!crudo) return null;
  const puntaje = puntajeDe(crudo.puntaje);
  const notaMile = sanear(crudo.nota_mile ?? crudo.notaMile, NOTA_MAX);
  const resultados = resultadosDe(crudo.resultados);
  if (puntaje === null || !notaMile || resultados.length === 0) return null;
  return { puntaje, notaMile, resultados };
}

function claveEstado(estado: EstadoRequisito): "mile.cumple" | "mile.parcial" | "mile.noCumple" {
  if (estado === "cumple") return "mile.cumple";
  if (estado === "parcial") return "mile.parcial";
  return "mile.noCumple";
}

function valorJson(valor: unknown): unknown {
  if (typeof valor !== "string") return valor;
  const limpio = valor.trim();
  if (!limpio) return null;
  try {
    return JSON.parse(limpio);
  } catch {
    return null;
  }
}

function objeto(valor: unknown): Record<string, unknown> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

function textoDeItem(item: unknown): string | null {
  if (typeof item === "string") return sanear(item, TEXTO_MAX);
  const crudo = objeto(item);
  if (!crudo) return null;
  return sanear(crudo.texto, TEXTO_MAX);
}

function idDeItem(item: unknown, usados: Set<string>, indice: number): string {
  const crudo = objeto(item);
  const pedido = crudo && typeof crudo.id === "string" ? crudo.id.trim() : "";
  if (/^[A-Za-z0-9_-]{1,40}$/.test(pedido) && !usados.has(pedido)) return pedido;
  let n = indice + 1;
  let id = `r${n}`;
  while (usados.has(id)) {
    n += 1;
    id = `r${n}`;
  }
  return id;
}

function sanear(valor: unknown, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!limpio) return null;
  return limpio.slice(0, maximo);
}

function idsDe(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  for (const item of valor) {
    const id = typeof item === "string" ? item.trim() : typeof item === "number" && Number.isInteger(item) ? String(item) : "";
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || vistos.has(id)) continue;
    vistos.add(id);
  }
  return [...vistos];
}

function puntajeDe(valor: unknown): number | null {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" ? Number(valor) : NaN;
  if (!Number.isInteger(numero) || numero < 0 || numero > 100) return null;
  return numero;
}

function intentoDe(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 1 || valor > 99) return 1;
  return valor;
}

function resultadosDe(valor: unknown): ResultadoRequisito[] {
  if (!Array.isArray(valor)) return [];
  const salida: ResultadoRequisito[] = [];
  for (const item of valor) {
    const crudo = objeto(item);
    if (!crudo) continue;
    const estado = ESTADOS.includes(crudo.estado as EstadoRequisito) ? (crudo.estado as EstadoRequisito) : null;
    const id = typeof crudo.id === "string" ? crudo.id.trim() : "";
    const frase = sanear(crudo.texto, TEXTO_MAX);
    const observacion = sanear(crudo.observacion, NOTA_MAX);
    if (!estado || !/^[A-Za-z0-9_-]{1,40}$/.test(id) || !frase || !observacion) continue;
    salida.push({ id, texto: frase, estado, observacion });
    if (salida.length === MAX_REQUISITOS) break;
  }
  return salida;
}
