import type { Veredicto } from "@/lib/admin/tipos";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { TareaFila, VeredictoFila } from "@/lib/db/tipos";
import { etiquetaDesdeNota, notaDeTexto } from "@/lib/revision/pesos";
import { tareasPropias, tareasVisibles, type Visor } from "./alcance";
import { baseNoLista, json } from "./json";

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
  };
}

/** Percentage and band for the member. A failed review has no score. Internal text stays out. */
export function notaPublica(fila: VeredictoFila | null): { nota: number; veredicto: Veredicto } | null {
  if (!fila || fila.origen === "error") return null;
  const nota = notaDeTexto(fila.score);
  if (nota === null) return null;
  return { nota, veredicto: etiquetaDesdeNota(nota) };
}

export async function tareaConNota(almacen: Almacen, tarea: TareaFila) {
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  const fila = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
  const visible = notaPublica(fila);
  return {
    ...tareaPublica(tarea),
    nota: visible?.nota ?? null,
    veredicto: visible?.veredicto ?? null,
  };
}

export async function listarTareasHttp(almacen: Almacen, visor: Visor, alcance: "evento" | "mias" = "evento"): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const tareas = alcance === "mias" ? await tareasPropias(almacen, visor) : await tareasVisibles(almacen, visor);
    if (alcance !== "mias") return json({ tareas: tareas.map(tareaPublica) });
    return json({ tareas: await Promise.all(tareas.map((tarea) => tareaConNota(almacen, tarea))) });
  } catch {
    return baseNoLista();
  }
}
