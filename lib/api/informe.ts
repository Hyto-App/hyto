import { bandejaDe, enlacePago, porPersona, resumir } from "@/lib/admin/vista";
import type { TareaAdmin } from "@/lib/admin/tipos";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { TareaFila } from "@/lib/db/tipos";
import { baseNoLista, json } from "./json";

export async function informeHttp(almacen: Almacen): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const vista = await armarInforme(almacen);
    return json(vista);
  } catch {
    return baseNoLista();
  }
}

export async function armarInforme(almacen: Almacen) {
  const proyecto = await almacen.ultimoProyecto();
  const usuarios = await almacen.listarUsuarios();
  const nombres = new Map(usuarios.map((usuario) => [usuario.id, usuario.nombre]));
  const todas = await almacen.listarTareas();
  const tareas = proyecto ? todas.filter((tarea) => tarea.proyectoId === proyecto.id) : [];
  const admin: TareaAdmin[] = [];
  for (const tarea of tareas) admin.push(await tareaAdmin(almacen, tarea, nombres));
  return {
    nombre: proyecto?.nombre ?? "",
    ejemplo: false as const,
    tareas: admin,
    bandeja: bandejaDe(admin),
    resumen: resumir(admin),
    personas: porPersona(admin),
  };
}

export async function tareaAdmin(almacen: Almacen, tarea: TareaFila, nombres?: Map<string, string>): Promise<TareaAdmin> {
  const mapa = nombres ?? new Map((await almacen.listarUsuarios()).map((usuario) => [usuario.id, usuario.nombre]));
  const evidencia = await almacen.ultimaEvidencia(tarea.id);
  const veredicto = evidencia ? await almacen.veredictoDe(evidencia.id) : null;
  return {
    id: tarea.id,
    titulo: tarea.titulo,
    tipo: tarea.tipo,
    monto: tarea.monto,
    tope: tarea.tope,
    condicion: tarea.condicion,
    miembroId: tarea.miembroId,
    miembro: mapa.get(tarea.miembroId) || (tarea.miembroId ? tarea.miembroId : "Sin asignar"),
    estado: tarea.estado,
    veredicto: veredicto?.origen === "error" ? null : (veredicto?.veredicto ?? null),
    frase: veredicto?.frase ?? null,
    origen: veredicto?.origen ?? null,
    codigo: veredicto?.origen === "error" ? veredicto.choice : null,
    montoRevisado: evidencia?.monto ?? null,
    fecha: evidencia?.fecha ?? null,
    hashPago: tarea.hashPago,
    credencialUrl: tarea.credencialUrl,
  };
}

export function pagoDe(hash: string | null): string | null {
  return enlacePago(hash);
}
