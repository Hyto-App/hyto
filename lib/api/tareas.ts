import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { TareaFila } from "@/lib/db/tipos";
import { tareasVisibles, type Visor } from "./alcance";
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

export async function listarTareasHttp(almacen: Almacen, visor: Visor): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const tareas = await tareasVisibles(almacen, visor);
    return json({ tareas: tareas.map(tareaPublica) });
  } catch {
    return baseNoLista();
  }
}
