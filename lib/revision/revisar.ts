import { claveDeGroq, enProduccion, urlDeLaya } from "@/lib/config/entorno";
import type { TareaFila } from "@/lib/db/tipos";
import type { FotoLeida } from "@/lib/blob/fotos";
import { esPdf } from "@/lib/evidencia/tipo";
import { cerrar, desdeFallo, stubLaya, type ResultadoRevision } from "./armar";
import { falloDeExcepcion, FalloRevision, registrarFallo } from "./fallo";
import { preguntarLaya } from "./laya";
import { conReintentos, esperaReintento, PAUSAS_REINTENTO_MS, PRESUPUESTO_REVISION_MS, TOPE_GROQ_MS, TOPE_LAYA_MS } from "./reintento";
import { describirFoto } from "./scout";

export type ContextoRevision = {
  claveGroq: string | null;
  layaUrl: string | null;
  fetchImpl?: typeof fetch;
  ahora?: () => number;
  esperar?: (ms: number) => Promise<void>;
  presupuestoMs?: number;
  produccion?: boolean;
};

export async function revisar(tarea: TareaFila, foto: FotoLeida | null, contexto: ContextoRevision): Promise<ResultadoRevision> {
  if (!foto) return fallar(new FalloRevision("sin_foto", { fuente: "revision", providerMessage: "foto" }));
  if (foto.tipo === "application/pdf" || esPdf(foto.bytes)) {
    return fallar(new FalloRevision("pdf", { fuente: "revision", providerMessage: "pdf" }));
  }
  const clave = contexto.claveGroq;
  if (!clave) return fallar(new FalloRevision("sin_clave", { fuente: "groq", providerMessage: "GROQ_API_KEY" }));
  const fetchImpl = contexto.fetchImpl ?? fetch;
  const ahora = contexto.ahora ?? Date.now;
  const repeticion = {
    ahora,
    esperar: contexto.esperar ?? esperaReintento,
    deadline: ahora() + (contexto.presupuestoMs ?? PRESUPUESTO_REVISION_MS),
    pausas: PAUSAS_REINTENTO_MS,
  };
  try {
    const descripcion = await conReintentos(
      (signal) => describirFoto(foto.bytes, foto.tipo, clave, fetchImpl, signal),
      { ...repeticion, topeIntentoMs: TOPE_GROQ_MS },
    );
    if (!contexto.layaUrl) {
      if (contexto.produccion ?? enProduccion()) return fallar(new FalloRevision("sin_laya", { fuente: "laya", providerMessage: "LAYA_URL" }));
      const cerrado = cerrar(tarea.tipo, tarea.tope, descripcion, stubLaya(tarea.tipo), "stub");
      if (!cerrado) return fallar(new FalloRevision("respuesta", { fuente: "laya", providerMessage: "stub" }));
      return cerrado;
    }
    const senales = await conReintentos(
      (signal) => preguntarLaya(contexto.layaUrl!, descripcion.texto, tarea.condicion, fetchImpl, signal),
      { ...repeticion, topeIntentoMs: TOPE_LAYA_MS },
    );
    const cerrado = cerrar(tarea.tipo, tarea.tope, descripcion, senales, "scout");
    if (!cerrado) return fallar(new FalloRevision("respuesta", { fuente: "laya", providerMessage: "veredicto" }));
    return cerrado;
  } catch (error) {
    return fallar(error instanceof FalloRevision ? error : falloDeExcepcion(error, "revision", clave));
  }
}

function fallar(fallo: FalloRevision): ResultadoRevision {
  registrarFallo(fallo);
  return desdeFallo(fallo);
}

export function contextoDesdeEntorno(fetchImpl?: typeof fetch): ContextoRevision {
  return {
    claveGroq: claveDeGroq(),
    layaUrl: urlDeLaya(),
    fetchImpl,
  };
}
