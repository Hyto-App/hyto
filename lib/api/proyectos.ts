import { normalizarMonto } from "@/lib/admin/vista";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { TareaFila } from "@/lib/db/tipos";
import type { TipoTarea } from "@/lib/integrante/tipos";
import { baseNoLista, json } from "./json";
import { tareaPublica } from "./tareas";

export async function crearProyectoHttp(request: Request, almacen: Almacen): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ aviso: "El cuerpo no es JSON." }, 400);
  }
  const proyecto = leerProyecto(body);
  if ("aviso" in proyecto) return json({ aviso: proyecto.aviso }, 400);
  try {
    await asegurarSemilla(almacen);
    await almacen.crearProyecto(proyecto.proyecto, proyecto.tareas);
    return json({ proyecto: { id: proyecto.proyecto.id, nombre: proyecto.proyecto.nombre }, tareas: proyecto.tareas.map(tareaPublica) }, 201);
  } catch {
    return baseNoLista();
  }
}

export async function leerProyectoHttp(almacen: Almacen): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const proyecto = await almacen.ultimoProyecto();
    if (!proyecto) return json({ aviso: "Todavía no hay un proyecto." }, 404);
    const tareas = (await almacen.listarTareas()).filter((tarea) => tarea.proyectoId === proyecto.id);
    return json({ proyecto: { id: proyecto.id, nombre: proyecto.nombre }, tareas: tareas.map(tareaPublica) });
  } catch {
    return baseNoLista();
  }
}

function leerProyecto(body: unknown): { proyecto: { id: string; nombre: string; creadoEn: string }; tareas: TareaFila[] } | { aviso: string } {
  if (!body || typeof body !== "object") return { aviso: "Escribe el nombre y al menos una tarea con monto." };
  const crudo = body as Record<string, unknown>;
  const nombre = typeof crudo.nombre === "string" ? crudo.nombre.trim() : "";
  if (!nombre || !Array.isArray(crudo.tareas) || crudo.tareas.length === 0) {
    return { aviso: "Escribe el nombre y al menos una tarea con monto." };
  }
  const proyectoId = crypto.randomUUID();
  const ahora = new Date().toISOString();
  const tareas: TareaFila[] = [];
  for (const item of crudo.tareas) {
    const tarea = leerTarea(item, proyectoId);
    if ("aviso" in tarea) return tarea;
    tareas.push(tarea);
  }
  return { proyecto: { id: proyectoId, nombre, creadoEn: ahora }, tareas };
}

function leerTarea(item: unknown, proyectoId: string): TareaFila | { aviso: string } {
  if (!item || typeof item !== "object") return { aviso: "Escribe el nombre y al menos una tarea con monto." };
  const crudo = item as Record<string, unknown>;
  const titulo = typeof crudo.titulo === "string" ? crudo.titulo.trim() : "";
  const tipo: TipoTarea | null = crudo.tipo === "reembolso" ? "reembolso" : crudo.tipo === "trabajo" ? "trabajo" : null;
  const monto = typeof crudo.monto === "string" || typeof crudo.monto === "number" ? normalizarMonto(String(crudo.monto)) : null;
  if (!titulo || !tipo || !monto) return { aviso: "Escribe el nombre y al menos una tarea con monto." };
  const condicion = typeof crudo.condicion === "string" ? crudo.condicion.trim() : "";
  const miembroId = typeof crudo.miembroId === "string" ? crudo.miembroId.trim() : "";
  const topeTexto = typeof crudo.tope === "string" || typeof crudo.tope === "number" ? normalizarMonto(String(crudo.tope)) : null;
  return {
    id: crypto.randomUUID(),
    proyectoId,
    titulo,
    tipo,
    monto,
    tope: tipo === "reembolso" ? (topeTexto ?? monto) : null,
    condicion,
    miembroId,
    walletCobro: "",
    estado: "pendiente",
    hashPago: null,
    contratoEscrow: null,
    credencialUrl: null,
  };
}
