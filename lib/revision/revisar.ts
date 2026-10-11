import { claveDeGemini, claveDeGroq, enProduccion, urlDeLaya } from "@/lib/config/entorno";
import type { TareaFila } from "@/lib/db/tipos";
import type { FotoLeida } from "@/lib/blob/fotos";
import { claseTextual, esEvidenciaTextual } from "@/lib/evidencia/tipo";
import { imagenDePdf, textoInsuficiente } from "@/lib/evidencia/pdf-imagen";
import { ajustarParaVision } from "@/lib/evidencia/vision";
import { transcribirEvidencia } from "@/lib/evidencia/transcribir";
import type { Idioma } from "@/lib/ui/idioma";
import { armarVeredicto, cerrar, desdeFallo, stubLaya, type Descripcion, type ResultadoRevision } from "./armar";
import { reglaDeEvento, type ContextoEvento } from "./contexto-evento";
import { falloDeExcepcion, FalloRevision, registrarFallo } from "./fallo";
import { describirFotoGemini } from "./gemini";
import { aplicarV4DeFaltantes } from "./faltantes-groq";
import { preguntarLaya, type LlamadaLaya } from "./laya";
import { montoSinUsd } from "./lectura";
import { nivelesConLectura } from "./lectura-completa";
import { motivosDeRegla } from "./pesos";
import { estructurarTranscripcion, textoParaLaya } from "./texto-estructurado";
import { preguntarRequisitos } from "./requisitos-laya";
import { maxIntentosMile, mileRequisitosActivo } from "./requisitos-bandera";
import { decidirRequisitos, leerRequisitos, rechazoDeDecision, serializarRechazo } from "./requisitos";
import {
  conReintentos,
  esperaReintento,
  PAUSAS_REINTENTO_MS,
  PRESUPUESTO_REVISION_MS,
  RESERVA_LAYA_MS,
  TOPE_GROQ_MS,
  TOPE_LAYA_MS,
  type OpcionesReintento,
} from "./reintento";
import { describirFoto } from "./scout";

export type ContextoRevision = {
  claveGroq: string | null;
  /** When set, Gemini describes the photo only after the Groq vision call fails. */
  claveGemini?: string | null;
  layaUrl: string | null;
  fetchImpl?: typeof fetch;
  ahora?: () => number;
  esperar?: (ms: number) => Promise<void>;
  presupuestoMs?: number;
  produccion?: boolean;
  /** Overrides HYTO_MILE_REQUISITOS. Unset reads the environment, which defaults to off. */
  mileActivo?: boolean;
  /** Overrides HYTO_MILE_TIPO_POR_TAREA. Unset reads the environment, which defaults to off. */
  tipoPorTarea?: boolean;
  /** Photos already saved for this task, including the one under review. */
  intento?: number;
  maxIntentos?: number;
  idioma?: Idioma;
  /** The event's description and AI context. The description and the rules reach the vision prompt. The rules also reach Laya and the grade. */
  evento?: ContextoEvento | null;
  /** Community description for the vision prompt. Ignored unless HYTO_TIPO_CUENTA is on. */
  organizacion?: string | null;
};

export async function revisar(tarea: TareaFila, foto: FotoLeida | null, contexto: ContextoRevision): Promise<ResultadoRevision> {
  if (!foto) return fallar(new FalloRevision("sin_foto", { fuente: "revision", providerMessage: "foto" }));
  const fetchImpl = contexto.fetchImpl ?? fetch;
  const ahora = contexto.ahora ?? Date.now;
  const presupuesto = contexto.presupuestoMs ?? PRESUPUESTO_REVISION_MS;
  const repeticion = {
    ahora,
    esperar: contexto.esperar ?? esperaReintento,
    deadline: ahora() + presupuesto,
    pausas: PAUSAS_REINTENTO_MS,
  };
  const reservaLaya = contexto.layaUrl ? Math.min(RESERVA_LAYA_MS, Math.floor(presupuesto / 3)) : 0;
  const paraDescribir = { ...repeticion, deadline: repeticion.deadline - reservaLaya };
  const llamarLaya: LlamadaLaya = (paso) => conReintentos(paso, { ...repeticion, topeIntentoMs: TOPE_LAYA_MS });
  // preguntarLaya reads these when the options object does not set them.
  // The call below only passes lectura, the same line as the sibling switch.
  Object.assign(llamarLaya, { tipoTarea: tarea.tipo, tipoPorTarea: contexto.tipoPorTarea });
  const claveGemini = contexto.claveGemini?.trim() || null;
  try {
    // A PDF, text list, or HTML receipt is read locally. A scanned PDF (pictures, no text layer)
    // is turned into one image and goes through the same vision path as a photo.
    const lectura = await prepararEvidencia(foto);
    if (lectura.vision && !contexto.claveGroq && !claveGemini) {
      return fallar(new FalloRevision("sin_clave", { fuente: "groq", providerMessage: "GROQ_API_KEY" }));
    }
    const descripcion = lectura.vision
      ? await describirConReserva(
          lectura.vision,
          tarea,
          contexto.claveGroq,
          claveGemini,
          fetchImpl,
          paraDescribir,
          contexto.idioma ?? "en",
          contexto.evento,
          contexto.organizacion,
        )
      : estructurarTranscripcion(lectura.transcrita.texto, { condicion: tarea.condicion, tipoTarea: tarea.tipo });
    const textual = !lectura.vision;
    const paraLaya = textoParaLaya(descripcion);
    const requisitos = (contexto.mileActivo ?? mileRequisitosActivo()) ? leerRequisitos(tarea.requisitos) : [];
    if (!contexto.layaUrl) {
      if (contexto.produccion ?? enProduccion()) return fallar(new FalloRevision("sin_laya", { fuente: "laya", providerMessage: "LAYA_URL" }));
      const cerrado = cerrar(tarea.tipo, tarea.tope, descripcion, stubLaya(tarea.tipo), "stub");
      if (!cerrado) return fallar(new FalloRevision("respuesta", { fuente: "laya", providerMessage: "stub" }));
      return cerrado;
    }
    if (requisitos.length > 0) {
      try {
        const niveles = await conReintentos(
          (signal) => preguntarRequisitos(contexto.layaUrl!, paraLaya, requisitos, fetchImpl, signal),
          { ...repeticion, topeIntentoMs: TOPE_LAYA_MS },
        );
        const estructurado = niveles
          ? cerrarRequisitos(tarea, descripcion, niveles, {
              idioma: contexto.idioma ?? "en",
              intento: contexto.intento ?? 1,
              maxIntentos: contexto.maxIntentos ?? maxIntentosMile(),
              ahora: new Date().toISOString(),
            })
          : null;
        if (estructurado) return estructurado;
      } catch (error) {
        if (!(error instanceof FalloRevision)) throw error;
      }
    }
    const senales = await preguntarLaya(
      contexto.layaUrl,
      paraLaya,
      tarea.condicion,
      fetchImpl,
      undefined,
      llamarLaya,
      reglaDeEvento(contexto.evento),
      { lectura: descripcion.lectura },
    );
    // A transcribed file has no Groq list. An empty faltantes there is not "nothing missing".
    const senalesParaNota = textual
      ? senales
      : aplicarV4DeFaltantes(senales, descripcion.lectura, tarea.condicion);
    const cerrado = cerrar(tarea.tipo, tarea.tope, descripcion, senalesParaNota, "scout");
    if (!cerrado) return fallar(new FalloRevision("respuesta", { fuente: "laya", providerMessage: "veredicto" }));
    return cerrado;
  } catch (error) {
    return fallar(error instanceof FalloRevision ? error : falloDeExcepcion(error, "revision", contexto.claveGroq));
  }
}

function cerrarRequisitos(
  tarea: TareaFila,
  descripcion: Descripcion,
  niveles: Array<0 | 1 | 2>,
  contexto: { idioma: Idioma; intento: number; maxIntentos: number; ahora: string },
): ResultadoRevision | null {
  const requisitos = leerRequisitos(tarea.requisitos);
  const decision = decidirRequisitos({
    requisitos,
    niveles: nivelesConLectura(niveles, descripcion.lectura),
    idioma: contexto.idioma,
    intento: contexto.intento,
    maxIntentos: contexto.maxIntentos,
  });
  if (!decision) return null;
  const monto = tarea.tipo === "reembolso" ? descripcion.monto : null;
  const fecha = tarea.tipo === "reembolso" ? descripcion.fecha : null;
  const armado = armarVeredicto({
    tipo: tarea.tipo,
    tope: tarea.tope,
    monto,
    fecha,
    montoSinUsd: montoSinUsd(descripcion.lectura),
    cumpleReglas: descripcion.lectura?.cumpleReglas,
    motivos: motivosDeRegla(descripcion.lectura?.cumpleReglas),
    score: String(decision.puntaje),
  });
  if (!armado) return null;
  const rechazo = rechazoDeDecision({ ...decision, puntaje: armado.nota }, contexto.intento, contexto.ahora);
  return {
    texto: descripcion.texto.trim(),
    monto,
    fecha,
    ...(descripcion.lectura ? { lectura: descripcion.lectura } : {}),
    choice: "requisitos",
    noul: armado.nota === 100,
    score: String(armado.nota),
    veredicto: armado.veredicto,
    nota: armado.nota,
    frase: decision.notaMile,
    origen: "scout",
    codigo: null,
    mile: {
      accion: decision.accion,
      rechazoJson: serializarRechazo(rechazo),
      puntaje: armado.nota,
      notaMile: decision.notaMile,
      resultados: decision.resultados,
    },
  };
}

/**
 * Groq first. Gemini runs on the same deadline only when Groq throws and a key is set.
 * The photo is turned upright and shrunk once, before the first attempt, so that work does not
 * eat into a 20 s attempt. The adjusted bytes are already upright, so each provider's own pass is a no-op.
 */
async function describirConReserva(
  original: FotoLeida,
  tarea: TareaFila,
  claveGroq: string | null,
  claveGemini: string | null,
  fetchImpl: typeof fetch,
  repeticion: Omit<OpcionesReintento, "topeIntentoMs">,
  idioma: "en" | "es",
  evento?: ContextoEvento | null,
  organizacion?: string | null,
): Promise<Descripcion> {
  const pedido = { condicion: tarea.condicion, tipoTarea: tarea.tipo, idioma, evento, organizacion };
  const opciones = { ...repeticion, topeIntentoMs: TOPE_GROQ_MS };
  const foto = await ajustarParaVision(original.bytes, original.tipo || "image/jpeg");
  if (!claveGroq) {
    return conReintentos(
      (signal) => describirFotoGemini(foto.bytes, foto.tipo, claveGemini ?? "", fetchImpl, signal, pedido),
      opciones,
    );
  }
  try {
    return await conReintentos(
      (signal) => describirFoto(foto.bytes, foto.tipo, claveGroq, fetchImpl, signal, pedido),
      opciones,
    );
  } catch (error) {
    if (!(error instanceof FalloRevision) || !claveGemini) throw error;
    try {
      return await conReintentos(
        (signal) => describirFotoGemini(foto.bytes, foto.tipo, claveGemini, fetchImpl, signal, pedido),
        opciones,
      );
    } catch {
      throw error;
    }
  }
}

type EvidenciaPreparada = { vision: FotoLeida; transcrita?: undefined } | { vision: null; transcrita: Descripcion };

/**
 * Photos go to vision as they are. PDF, text, and HTML are transcribed locally. A PDF whose text layer
 * is empty or nearly empty (a scan) is turned into a JPEG of its pages for vision. When that PDF has
 * no picture either, the original "no readable text" failure stands.
 */
export async function prepararEvidencia(foto: FotoLeida): Promise<EvidenciaPreparada> {
  if (!esEvidenciaTextual(foto)) return { vision: foto };
  const pdf = claseTextual(foto.tipo, foto.bytes) === "pdf";
  let transcrita: Descripcion | null = null;
  let falloTexto: FalloRevision | null = null;
  // pdf.js can detach the buffer it reads, so the text pass gets its own copy and the scan pass keeps these bytes.
  const copia = pdf ? new Uint8Array(foto.bytes) : foto.bytes;
  try {
    transcrita = await transcribirEvidencia({ tipo: foto.tipo, bytes: copia });
  } catch (error) {
    if (!pdf || !(error instanceof FalloRevision) || error.code !== "sin_texto") throw error;
    falloTexto = error;
  }
  if (pdf && (!transcrita || textoInsuficiente(transcrita.texto))) {
    const imagen = await imagenDePdf(foto.bytes);
    if (imagen) return { vision: { tipo: imagen.tipo, bytes: imagen.bytes } };
  }
  if (transcrita) return { vision: null, transcrita };
  throw falloTexto ?? new FalloRevision("sin_texto", { fuente: "revision", providerMessage: "pdf" });
}

function fallar(fallo: FalloRevision): ResultadoRevision {
  registrarFallo(fallo);
  return desdeFallo(fallo);
}

export function contextoDesdeEntorno(fetchImpl?: typeof fetch): ContextoRevision {
  return {
    claveGroq: claveDeGroq(),
    claveGemini: claveDeGemini(),
    layaUrl: urlDeLaya(),
    fetchImpl,
  };
}
