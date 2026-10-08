import { claveDeLaya } from "@/lib/config/entorno";
import type { TipoTarea } from "@/lib/integrante/tipos";
import type { Senales } from "./armar";
import { falloDeExcepcion, falloHttp, FalloRevision } from "./fallo";
import { condicionParaLaya } from "./contexto-evento";
import {
  cuerpoLaya,
  preguntaRegla,
  preguntasClasificacion,
  preguntasFactura,
  preguntasTrabajo,
  type Pregunta,
} from "./laya-preguntas";
import { noulCerca, probabilidadesCerca } from "./margen";
import { motivosDeRegla, motivosFactura, motivosTrabajo, notaDeFactura, notaDeTrabajo, type MotivoTope } from "./pesos";
import { escribirSnapshot } from "./snapshot-razones";
import { fechaCoincideConPedido, fechaEscrita, montoEscrito } from "./texto-estructurado";
import { claseConTipoDeTarea, tipoPorTareaActivo } from "./tipo-por-tarea";

export { cuerpoLaya, preguntasClasificacion, preguntasFactura, preguntasTrabajo } from "./laya-preguntas";

export function urlLaya(base: string): string {
  const limpia = base.trim().replace(/\/$/, "");
  if (limpia.endsWith("/v1/systemone")) return limpia;
  return `${limpia}/v1/systemone`;
}

const CLASE = ["trabajo", "factura", "otra"] as const;
const LUGAR = ["pared_o_superficie", "stand_o_mesa", "espacio_abierto", "no_claro"] as const;
const V1 = ["es_lo_pedido", "es_otra_cosa", "no_se_puede_saber"] as const;
const T5 = ["pintar", "limpiar", "armar_o_montar", "vender_o_atender", "transportar", "otra_o_no_claro"] as const;
const T6 = ["terminado", "a_medias", "sin_empezar", "no_claro"] as const;
const F1 = ["coincide_con_lo_pedido", "otro_gasto", "no_se_ve"] as const;
const G1 = ["transporte", "comida_o_bebida", "materiales", "impresion_o_papeleria", "otro_o_no_claro"] as const;

export type ClaseEvidencia = (typeof CLASE)[number];

export type RespuestasTrabajo = {
  lugar: (typeof LUGAR)[number];
  v1: (typeof V1)[number];
  v2: 0 | 1 | 2;
  v3: boolean;
  v4: boolean;
  t5: (typeof T5)[number];
  t6: (typeof T6)[number];
  t7: boolean;
  t8: boolean;
  t9: boolean;
  t10: 0 | 1 | 2;
};

export type RespuestasFactura = {
  f1: (typeof F1)[number];
  f2: boolean;
  f3: boolean;
  f4: 0 | 1 | 2;
  g1: (typeof G1)[number];
  g2: boolean;
  g3: boolean;
  g4: boolean;
  g5: 0 | 1 | 2;
};

export function leerClase(json: unknown): ClaseEvidencia | null {
  const etiqueta = leerEtiqueta(json, "c1", CLASE);
  if (etiqueta === "trabajo" || etiqueta === "factura" || etiqueta === "otra") return etiqueta;
  return null;
}

export function leerTrabajo(json: unknown): RespuestasTrabajo | null {
  const lugar = leerEtiqueta(json, "lugar", LUGAR);
  const v1 = leerEtiqueta(json, "v1", V1);
  const v2 = leerIndice(json, "v2");
  const v3 = leerSiNo(json, "v3");
  const v4 = leerSiNo(json, "v4");
  const t5 = leerEtiqueta(json, "t5", T5);
  const t6 = leerEtiqueta(json, "t6", T6);
  const t7 = leerSiNo(json, "t7");
  const t8 = leerSiNo(json, "t8");
  const t9 = leerSiNo(json, "t9");
  const t10 = leerIndice(json, "t10");
  if (!lugar || !v1 || v2 === null || v3 === null || v4 === null || !t5 || !t6 || t7 === null || t8 === null || t9 === null || t10 === null) {
    return null;
  }
  return { lugar, v1, v2, v3, v4, t5, t6, t7, t8, t9, t10 };
}

export function leerFactura(json: unknown): RespuestasFactura | null {
  const f1 = leerEtiqueta(json, "f1", F1);
  const f2 = leerSiNo(json, "f2");
  const f3 = leerSiNo(json, "f3");
  const f4 = leerIndice(json, "f4");
  const g1 = leerEtiqueta(json, "g1", G1);
  const g2 = leerSiNo(json, "g2");
  const g3 = leerSiNo(json, "g3");
  const g4 = leerSiNo(json, "g4");
  const g5 = leerIndice(json, "g5");
  if (!f1 || f2 === null || f3 === null || f4 === null || !g1 || g2 === null || g3 === null || g4 === null || g5 === null) return null;
  return { f1, f2, f3, f4, g1, g2, g3, g4, g5 };
}

// The grade is the weighted sum in pesos.ts. A single yes does not raise it past that sum.
export function senalesDeTrabajo(respuestas: RespuestasTrabajo, condicion = ""): Senales {
  const nota = notaDeTrabajo(respuestas, condicion);
  const motivos = motivosTrabajo(respuestas);
  return {
    choice: "trabajo",
    noul: nota === 100,
    score: String(nota),
    ...(motivos.length > 0 ? { motivos } : {}),
  };
}

/** Mile already wrote that this is a receipt. Laya must not score it as work. */
export function esReciboEscrito(texto: string): boolean {
  return /Evidence type:\s*a receipt or an invoice\b/i.test(texto);
}

/**
 * The notes already name an amount, a date, or an item when Laya said they were missing.
 * A date that matches the request, with an amount, is not "not reasonable".
 */
export function corregirFactura(respuestas: RespuestasFactura, texto: string, condicion = ""): RespuestasFactura {
  let siguiente = respuestas;
  if (!siguiente.f2 && montoEscrito(texto)) siguiente = { ...siguiente, f2: true };
  if (!siguiente.f3 && fechaEscrita(texto)) siguiente = { ...siguiente, f3: true };
  if (!siguiente.g3 && itemsNombrados(texto)) siguiente = { ...siguiente, g3: true };
  if (
    !siguiente.g2 &&
    siguiente.f1 === "coincide_con_lo_pedido" &&
    montoEscrito(texto) &&
    fechaCoincideConPedido(texto, condicion)
  ) {
    siguiente = { ...siguiente, g2: true };
  }
  return siguiente;
}

function itemsNombrados(texto: string): boolean {
  const linea = texto.match(/^Items:\s*(.+)$/m);
  if (!linea) return false;
  const valor = (linea[1] ?? "").trim().toLowerCase().replace(/\.+$/, "");
  return valor.length > 0 && valor !== "none named" && valor !== "none" && valor !== "not shown";
}

export function senalesDeFactura(respuestas: RespuestasFactura): Senales {
  const nota = notaDeFactura(respuestas);
  const motivos = motivosFactura(respuestas);
  return {
    choice: "factura",
    noul: nota === 100,
    score: String(nota),
    ...(motivos.length > 0 ? { motivos } : {}),
  };
}

const IDS_TRABAJO = ["lugar", "v1", "v2", "v3", "v4", "t5", "t6", "t7", "t8", "t9", "t10"] as const;
const IDS_FACTURA = ["f1", "f2", "f3", "f4", "g1", "g2", "g3", "g4", "g5"] as const;

export function idsCerca(json: unknown, ids: readonly string[]): string[] {
  const cerca: string[] = [];
  for (const id of ids) {
    if (nodoCerca(nodoDe(json, id))) cerca.push(id);
  }
  return cerca;
}

/** Runs one Laya call. Each call gets its own signal, so the second one does not inherit what the first used. */
export type LlamadaLaya = <T>(paso: (signal: AbortSignal | undefined) => Promise<T>) => Promise<T>;

/** tipoTarea is ignored unless HYTO_MILE_TIPO_POR_TAREA is on. tipoPorTarea overrides that switch. */
export type OpcionesPreguntarLaya = {
  tipoTarea?: TipoTarea | null;
  tipoPorTarea?: boolean;
};

export async function preguntarLaya(
  base: string,
  texto: string,
  condicion: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
  llamar: LlamadaLaya = (paso) => paso(signal),
  regla?: string | null,
  opciones?: OpcionesPreguntarLaya,
): Promise<Senales> {
  const clave = claveDeLaya();
  if (!base.trim()) throw new FalloRevision("sin_clave", { fuente: "laya", providerMessage: "LAYA_URL" });
  const pedido = condicion.trim();
  const reglaLimpia = (regla ?? "").trim();
  const pedidoConRegla = reglaLimpia ? condicionParaLaya(pedido, { contextoIa: reglaLimpia }) : pedido;
  const preguntar = (preguntas: Record<string, Pregunta>) =>
    llamar((senal) => enviar(base, texto, pedidoConRegla, preguntas, fetchImpl, senal, clave));
  const claseJson = await preguntar(preguntasClasificacion(pedidoConRegla));
  const leida = leerClase(claseJson);
  if (!leida) throw new FalloRevision("respuesta", { fuente: "laya", providerMessage: "c1", secreto: clave });
  const seguirTarea = opciones?.tipoPorTarea ?? tipoPorTareaActivo();
  const clase = seguirTarea
    ? claseConTipoDeTarea(leida, {
        tipoTarea: opciones?.tipoTarea ?? null,
        texto,
        c1Cerca: idsCerca(claseJson, ["c1"]).includes("c1"),
      })
    : leida === "trabajo" && esReciboEscrito(texto)
      ? "factura"
      : leida;
  const cercaClase = idsCerca(claseJson, ["c1"]);
  if (clase === "otra" || clase === "trabajo") {
    const json = await preguntar(conRegla(preguntasTrabajo(pedidoConRegla), reglaLimpia));
    const respuestas = leerTrabajo(json);
    if (!respuestas) throw new FalloRevision("respuesta", { fuente: "laya", providerMessage: "trabajo", secreto: clave });
    const cerca = [...cercaClase, ...idsCerca(json, IDS_TRABAJO)];
    const cumple = leerRegla(json, reglaLimpia);
    // "otra" used to force 0% before asking whether the photo matches the request.
    // Attendance / scene evidence often lands in "otra"; only force 0 when it also fails the match.
    if (clase === "otra" && respuestas.v1 === "es_otra_cosa") {
      return {
        choice: "otra",
        noul: false,
        score: "0",
        motivos: unirMotivos(["otra"], cumple),
        detalle: escribirSnapshot({ clase: "otra", trabajo: null, factura: null, cerca, cumpleRegla: cumple }),
      };
    }
    return {
      ...conMotivoRegla(senalesDeTrabajo(respuestas, pedido), cumple),
      detalle: escribirSnapshot({
        clase: "trabajo",
        trabajo: respuestas,
        factura: null,
        cerca,
        cumpleRegla: cumple,
      }),
    };
  }
  const json = await preguntar(conRegla(preguntasFactura(pedidoConRegla), reglaLimpia));
  const leidas = leerFactura(json);
  if (!leidas) throw new FalloRevision("respuesta", { fuente: "laya", providerMessage: "factura", secreto: clave });
  const respuestas = corregirFactura(leidas, texto, pedido);
  const cumple = leerRegla(json, reglaLimpia);
  return {
    ...conMotivoRegla(senalesDeFactura(respuestas), cumple),
    detalle: escribirSnapshot({
      clase: "factura",
      trabajo: null,
      factura: respuestas,
      cerca: [...cercaClase, ...idsCerca(json, IDS_FACTURA)],
      cumpleRegla: cumple,
    }),
  };
}

function conRegla(preguntas: Record<string, Pregunta>, regla: string): Record<string, Pregunta> {
  if (!regla) return preguntas;
  return { ...preguntas, r1: preguntaRegla(regla) };
}

/** Null when the organizer wrote no rule. A missing answer when a rule exists is a failed review. */
function leerRegla(json: unknown, regla: string): boolean | null {
  if (!regla) return null;
  const cumple = leerSiNo(json, "r1");
  if (cumple === null) throw new FalloRevision("respuesta", { fuente: "laya", providerMessage: "r1" });
  return cumple;
}

function unirMotivos(base: MotivoTope[], cumple: boolean | null): MotivoTope[] {
  const motivos = [...base];
  for (const motivo of motivosDeRegla(cumple)) {
    if (!motivos.includes(motivo)) motivos.push(motivo);
  }
  return motivos;
}

function conMotivoRegla(senales: Senales, cumple: boolean | null): Senales {
  const motivos = unirMotivos(senales.motivos ?? [], cumple);
  if (motivos.length === 0) return senales;
  return { ...senales, motivos };
}

async function enviar(
  base: string,
  texto: string,
  condicion: string,
  preguntas: Record<string, Pregunta>,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
  clave: string | null,
): Promise<unknown> {
  let respuesta: Response;
  try {
    respuesta = await fetchImpl(urlLaya(base), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(clave ? { authorization: `Bearer ${clave}` } : {}),
      },
      body: JSON.stringify(cuerpoLaya(texto, condicion, preguntas)),
      signal,
    });
  } catch (error) {
    throw falloDeExcepcion(error, "laya", clave);
  }
  if (!respuesta.ok) throw await falloHttp(respuesta, "laya", clave);
  try {
    return await respuesta.json();
  } catch {
    throw new FalloRevision("respuesta", { fuente: "laya", status: respuesta.status, providerMessage: "json", secreto: clave });
  }
}

function nodoDe(json: unknown, id: string): Record<string, unknown> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const raiz = json as Record<string, unknown>;
  const answers = raiz.answers;
  if (answers && typeof answers === "object" && !Array.isArray(answers)) {
    const anidado = (answers as Record<string, unknown>)[id];
    if (anidado && typeof anidado === "object" && !Array.isArray(anidado)) return anidado as Record<string, unknown>;
  }
  const directo = raiz[id];
  if (directo && typeof directo === "object" && !Array.isArray(directo)) return directo as Record<string, unknown>;
  return null;
}

function leerEtiqueta<T extends string>(json: unknown, id: string, etiquetas: readonly T[]): T | null {
  const nodo = nodoDe(json, id);
  if (!nodo) return null;
  const directo = nodo.choice;
  if (typeof directo === "string") {
    const limpio = directo.trim();
    if (etiquetas.includes(limpio as T)) return limpio as T;
  }
  if (!("probabilities" in nodo)) return null;
  return etiquetaMayor(nodo.probabilities, etiquetas);
}

function etiquetaMayor<T extends string>(probabilities: unknown, etiquetas: readonly T[]): T | null {
  if (!probabilities || typeof probabilities !== "object" || Array.isArray(probabilities)) return null;
  const crudo = probabilities as Record<string, unknown>;
  let mejor = -Infinity;
  let ganador: T | null = null;
  let empate = false;
  for (const etiqueta of etiquetas) {
    const valor = numero(crudo[etiqueta]);
    if (valor === null) continue;
    if (valor > mejor) {
      mejor = valor;
      ganador = etiqueta;
      empate = false;
    } else if (valor === mejor) empate = true;
  }
  if (empate || !ganador) return null;
  return ganador;
}

function leerSiNo(json: unknown, id: string): boolean | null {
  const nodo = nodoDe(json, id);
  if (!nodo) return null;
  const directo = nodo.noul;
  if (typeof directo === "boolean") return directo;
  if (typeof directo === "number" && Number.isFinite(directo)) return directo >= 0.5;
  if (typeof directo === "string") {
    const limpio = directo.trim().toLowerCase();
    if (limpio === "true" || limpio === "si" || limpio === "sí" || limpio === "yes") return true;
    if (limpio === "false" || limpio === "no") return false;
  }
  return null;
}

export function leerIndice(json: unknown, id: string): 0 | 1 | 2 | null {
  const nodo = nodoDe(json, id);
  if (!nodo) return null;
  if ("probabilities" in nodo) {
    const indice = indiceMayor(nodo.probabilities);
    if (indice === 0 || indice === 1 || indice === 2) return indice;
    return null;
  }
  if (nodo.score === 0 || nodo.score === 1 || nodo.score === 2) return nodo.score;
  return null;
}

function indiceMayor(probabilities: unknown): number | null {
  const valores = listaProbabilidades(probabilities);
  if (!valores) return null;
  let mejor = -Infinity;
  let indice = -1;
  for (let i = 0; i < valores.length; i += 1) {
    const probabilidad = valores[i];
    if (probabilidad === null || probabilidad <= mejor) continue;
    mejor = probabilidad;
    indice = i;
  }
  if (indice < 0 || indice > 2) return null;
  return indice;
}

function listaProbabilidades(probabilities: unknown): Array<number | null> | null {
  if (Array.isArray(probabilities)) return probabilities.map(numero);
  if (!probabilities || typeof probabilities !== "object") return null;
  const crudo = probabilities as Record<string, unknown>;
  const indices = Object.keys(crudo)
    .map((clave) => Number(clave))
    .filter((indice) => Number.isInteger(indice) && indice >= 0);
  if (indices.length === 0) return null;
  const lista: Array<number | null> = Array.from({ length: Math.max(...indices) + 1 }, () => null);
  for (const indice of indices) lista[indice] = numero(crudo[String(indice)]);
  return lista;
}

function nodoCerca(nodo: Record<string, unknown> | null): boolean {
  if (!nodo) return false;
  if ("probabilities" in nodo && probabilidadesCerca(listaNumeros(nodo.probabilities))) return true;
  if (typeof nodo.noul === "number") return noulCerca(nodo.noul);
  return false;
}

function listaNumeros(probabilities: unknown): number[] {
  if (Array.isArray(probabilities)) return probabilities.map(numero).filter((valor): valor is number => valor !== null);
  if (!probabilities || typeof probabilities !== "object") return [];
  return Object.values(probabilities as Record<string, unknown>)
    .map(numero)
    .filter((valor): valor is number => valor !== null);
}

function numero(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string" && valor.trim() && Number.isFinite(Number(valor))) return Number(valor);
  return null;
}
