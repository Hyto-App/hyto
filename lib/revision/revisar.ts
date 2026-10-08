import { claveDeGemini, claveDeGroq, enProduccion, urlDeLaya } from "@/lib/config/entorno";
import type { TareaFila } from "@/lib/db/tipos";
import type { FotoLeida } from "@/lib/blob/fotos";
import { esEvidenciaTextual } from "@/lib/evidencia/tipo";
import { transcribirEvidencia } from "@/lib/evidencia/transcribir";
import type { Idioma } from "@/lib/ui/idioma";
import { armarVeredicto, cerrar, desdeFallo, stubLaya, type Descripcion, type ResultadoRevision } from "./armar";
import { condicionParaLaya, type ContextoEvento } from "./contexto-evento";
import { falloDeExcepcion, FalloRevision, registrarFallo } from "./fallo";
import { describirFotoGemini } from "./gemini";
import { preguntarLaya } from "./laya";
import { montoSinUsd } from "./lectura";
import { estructurarTranscripcion, textoParaLaya } from "./texto-estructurado";
import { preguntarRequisitos } from "./requisitos-laya";
import { maxIntentosMile, mileRequisitosActivo } from "./requisitos-bandera";
import { decidirRequisitos, leerRequisitos, rechazoDeDecision, serializarRechazo } from "./requisitos";
import { conReintentos, esperaReintento, PAUSAS_REINTENTO_MS, PRESUPUESTO_REVISION_MS, TOPE_GROQ_MS, TOPE_LAYA_MS, type OpcionesReintento } from "./reintento";
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
  /** Photos already saved for this task, including the one under review. */
  intento?: number;
  maxIntentos?: number;
  idioma?: Idioma;
  /** The event's description and AI context. Read by the vision prompt only. */
  evento?: ContextoEvento | null;
};

export async function revisar(tarea: TareaFila, foto: FotoLeida | null, contexto: ContextoRevision): Promise<ResultadoRevision> {
  if (!foto) return fallar(new FalloRevision("sin_foto", { fuente: "revision", providerMessage: "foto" }));
  const fetchImpl = contexto.fetchImpl ?? fetch;
  const ahora = contexto.ahora ?? Date.now;
  const repeticion = {
    ahora,
    esperar: contexto.esperar ?? esperaReintento,
    deadline: ahora() + (contexto.presupuestoMs ?? PRESUPUESTO_REVISION_MS),
    pausas: PAUSAS_REINTENTO_MS,
  };
  const claveGemini = contexto.claveGemini?.trim() || null;
  if (!esEvidenciaTextual(foto) && !contexto.claveGroq && !claveGemini) {
    return fallar(new FalloRevision("sin_clave", { fuente: "groq", providerMessage: "GROQ_API_KEY" }));
  }
  try {
    const cruda = esEvidenciaTextual(foto)
      ? await transcribirEvidencia(foto)
      : await describirConReserva(
          foto,
          tarea,
          contexto.claveGroq,
          claveGemini,
          fetchImpl,
          repeticion,
          contexto.idioma ?? "en",
          contexto.evento,
        );
    const descripcion = esEvidenciaTextual(foto)
      ? estructurarTranscripcion(cruda.texto, { condicion: tarea.condicion, tipoTarea: tarea.tipo })
      : cruda;
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
    const senales = await conReintentos(
      (signal) => preguntarLaya(contexto.layaUrl!, paraLaya, condicionParaLaya(tarea.condicion, contexto.evento), fetchImpl, signal),
      { ...repeticion, topeIntentoMs: TOPE_LAYA_MS },
    );
    const cerrado = cerrar(tarea.tipo, tarea.tope, descripcion, senales, "scout");
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
    niveles,
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

/** Groq first. Gemini runs on the same deadline only when Groq throws and a key is set. */
async function describirConReserva(
  foto: FotoLeida,
  tarea: TareaFila,
  claveGroq: string | null,
  claveGemini: string | null,
  fetchImpl: typeof fetch,
  repeticion: Omit<OpcionesReintento, "topeIntentoMs">,
  idioma: "en" | "es",
  evento?: ContextoEvento | null,
): Promise<Descripcion> {
  const pedido = { condicion: tarea.condicion, tipoTarea: tarea.tipo, idioma, evento };
  const opciones = { ...repeticion, topeIntentoMs: TOPE_GROQ_MS };
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
