import type { Veredicto } from "@/lib/admin/tipos";
import type { Almacen } from "@/lib/db/almacen";
import { dificultadGuardada, prioridadGuardada } from "@/lib/tareas/clasificacion";
import type { EvidenciaFila, TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { etiquetasDesdeVeredicto } from "@/lib/revision/mostrar-razones";
import { etiquetaDesdeNota, notaDeTexto } from "@/lib/revision/pesos";
import type { EtiquetaNota } from "@/lib/revision/razones";
import { leerRechazo, leerRequisitos, leerRevisionMile, type RechazoGuardado, type RevisionMile } from "@/lib/revision/requisitos";
import { tareasPropias, tareasVisibles, type Visor } from "./alcance";
import { lineaDeEnvio } from "./etapa";
import { baseNoLista, json } from "./json";

const PRIVADA = { "cache-control": "private, no-store" };

export function tareaPublica(tarea: TareaFila) {
  return {
    id: tarea.id,
    proyectoId: tarea.proyectoId,
    titulo: tarea.titulo,
    tipo: tarea.tipo,
    monto: tarea.monto,
    tope: tarea.tope,
    condicion: tarea.condicion,
    miembroId: tarea.miembroId,
    walletCobro: tarea.walletCobro,
    estado: tarea.estado,
    hashPago: tarea.hashPago,
    contratoEscrow: tarea.contratoEscrow,
    prioridad: prioridadGuardada(tarea.prioridad),
    dificultad: dificultadGuardada(tarea.dificultad),
    requisitos: leerRequisitos(tarea.requisitos),
  };
}

export function rechazoPublico(tarea: TareaFila): {
  nota: string | null;
  fallidos: string[];
  en: string | null;
  origen: RechazoGuardado["origen"];
} | null {
  const rechazo = leerRechazo(tarea.rechazo);
  if (!rechazo) return null;
  return {
    nota: rechazo.nota,
    fallidos: rechazo.fallidos,
    en: rechazo.en || null,
    origen: rechazo.origen,
  };
}

export function revisionPublica(tarea: TareaFila, fila: VeredictoFila | null): RevisionMile | null {
  if (fila && fila.origen !== "error") {
    const desdeFila = leerRevisionMile(fila.mile);
    if (desdeFila) return desdeFila;
  }
  const rechazo = leerRechazo(tarea.rechazo);
  if (!rechazo || rechazo.puntaje === null || !rechazo.notaMile || rechazo.resultados.length === 0) return null;
  return { puntaje: rechazo.puntaje, notaMile: rechazo.notaMile, resultados: rechazo.resultados };
}

/** Percentage and band for the member. A failed review has no score. Internal text stays out. */
export function notaPublica(fila: VeredictoFila | null): { nota: number; veredicto: Veredicto } | null {
  if (!fila || fila.origen === "error") return null;
  const nota = notaDeTexto(fila.score);
  if (nota === null) return null;
  return { nota, veredicto: etiquetaDesdeNota(nota) };
}

/** Reviewer notes the member can read. The raw model text stays on the verdict row. */
export function notasPublicas(
  fila: VeredictoFila | null,
  evidencia: Pick<EvidenciaFila, "monto" | "fecha"> | null,
  tarea: Pick<TareaFila, "tope" | "tipo">,
): EtiquetaNota[] {
  if (!fila || fila.origen === "error") return [];
  return etiquetasDesdeVeredicto({
    textoScout: fila.textoScout,
    origen: fila.origen,
    monto: evidencia?.monto ?? null,
    fecha: evidencia?.fecha ?? null,
    tope: tarea.tope,
    tipo: tarea.tipo,
  });
}

export async function tareaConNota(almacen: Almacen, tarea: TareaFila, nombres?: Map<string, string>) {
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  const fila = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
  const visible = notaPublica(fila);
  const rechazo = rechazoPublico(tarea);
  const linea = lineaDeEnvio(tarea, evidencia, fila);
  return {
    ...tareaPublica(tarea),
    evento: nombres?.get(tarea.proyectoId) ?? null,
    nota: visible?.nota ?? null,
    veredicto: visible?.veredicto ?? null,
    revisionFallida: fila?.origen === "error",
    notas: notasPublicas(fila, evidencia, tarea),
    rechazo,
    rechazada: tarea.estado === "pendiente" && rechazo !== null,
    intentos: await almacen.contarEvidencias(tarea.id),
    revision: revisionPublica(tarea, fila),
    etapa: linea.etapa,
    enviadaEn: linea.enviadaEn,
    tipoArchivo: evidencia?.tipoArchivo ?? null,
  };
}

export async function listarTareasHttp(almacen: Almacen, visor: Visor, alcance: "evento" | "mias" = "evento"): Promise<Response> {
  try {
    const tareas = alcance === "mias" ? await tareasPropias(almacen, visor) : await tareasVisibles(almacen, visor);
    if (alcance !== "mias") return json({ tareas: tareas.map(tareaPublica) }, 200, PRIVADA);
    const nombres = new Map((await almacen.listarProyectos()).map((proyecto) => [proyecto.id, proyecto.nombre]));
    return json({ tareas: await Promise.all(tareas.map((tarea) => tareaConNota(almacen, tarea, nombres))) }, 200, PRIVADA);
  } catch {
    return baseNoLista();
  }
}
