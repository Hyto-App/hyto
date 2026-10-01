import { claveDeGroq, urlDeLaya } from "@/lib/config/entorno";
import type { TareaFila } from "@/lib/db/tipos";
import type { FotoLeida } from "@/lib/blob/fotos";
import { cerrar, desdeFallo, stubLaya, type ResultadoRevision } from "./armar";
import { falloDeExcepcion, FalloRevision, registrarFallo } from "./fallo";
import { preguntarLaya } from "./laya";
import { describirFoto } from "./scout";

export type ContextoRevision = {
  claveGroq: string | null;
  layaUrl: string | null;
  fetchImpl?: typeof fetch;
};

export async function revisar(tarea: TareaFila, foto: FotoLeida | null, contexto: ContextoRevision): Promise<ResultadoRevision> {
  if (!foto) return fallar(new FalloRevision("sin_foto", { fuente: "revision", providerMessage: "foto" }));
  if (!contexto.claveGroq) return fallar(new FalloRevision("sin_clave", { fuente: "groq", providerMessage: "GROQ_API_KEY" }));
  const fetchImpl = contexto.fetchImpl ?? fetch;
  try {
    const descripcion = await describirFoto(foto.bytes, foto.tipo, contexto.claveGroq, fetchImpl, AbortSignal.timeout(12000));
    if (!contexto.layaUrl) {
      const cerrado = cerrar(tarea.tipo, tarea.tope, descripcion, stubLaya(tarea.tipo), "stub");
      if (!cerrado) return fallar(new FalloRevision("respuesta", { fuente: "laya", providerMessage: "stub" }));
      return cerrado;
    }
    const senales = await preguntarLaya(
      contexto.layaUrl,
      descripcion.texto,
      tarea.condicion,
      tarea.tipo,
      fetchImpl,
      AbortSignal.timeout(8000),
    );
    const cerrado = cerrar(tarea.tipo, tarea.tope, descripcion, senales, "scout");
    if (!cerrado) return fallar(new FalloRevision("respuesta", { fuente: "laya", providerMessage: "veredicto" }));
    return cerrado;
  } catch (error) {
    return fallar(error instanceof FalloRevision ? error : falloDeExcepcion(error, "revision", contexto.claveGroq));
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
