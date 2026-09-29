import { claveDeGroq, urlDeLaya } from "@/lib/config/entorno";
import type { TareaFila } from "@/lib/db/tipos";
import type { FotoLeida } from "@/lib/blob/fotos";
import { cerrar, desdeGuion, stubLaya, type ResultadoRevision } from "./armar";
import { preguntarLaya } from "./laya";
import { describirFoto } from "./scout";

export type ContextoRevision = {
  claveGroq: string | null;
  layaUrl: string | null;
  fetchImpl?: typeof fetch;
};

export async function revisar(tarea: TareaFila, foto: FotoLeida | null, contexto: ContextoRevision): Promise<ResultadoRevision> {
  const fetchImpl = contexto.fetchImpl ?? fetch;
  if (!contexto.claveGroq || !foto) return desdeGuion(tarea.tipo, tarea.tope);
  try {
    const descripcion = await describirFoto(foto.bytes, foto.tipo, contexto.claveGroq, fetchImpl, AbortSignal.timeout(12000));
    if (!descripcion) return desdeGuion(tarea.tipo, tarea.tope);
    if (!contexto.layaUrl) {
      const senales = stubLaya(tarea.tipo);
      return cerrar(tarea.tipo, tarea.tope, descripcion, senales, "scout") ?? desdeGuion(tarea.tipo, tarea.tope);
    }
    const senales = await preguntarLaya(contexto.layaUrl, descripcion.texto, tarea.condicion, fetchImpl, AbortSignal.timeout(8000));
    if (!senales) return desdeGuion(tarea.tipo, tarea.tope);
    return cerrar(tarea.tipo, tarea.tope, descripcion, senales, "scout") ?? desdeGuion(tarea.tipo, tarea.tope);
  } catch {
    return desdeGuion(tarea.tipo, tarea.tope);
  }
}

export function contextoDesdeEntorno(fetchImpl?: typeof fetch): ContextoRevision {
  return {
    claveGroq: claveDeGroq(),
    layaUrl: urlDeLaya(),
    fetchImpl,
  };
}
