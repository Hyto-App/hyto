import { normalizarMonto } from "@/lib/admin/vista";
import type { Almacen } from "@/lib/db/almacen";
import { asegurarSemilla } from "@/lib/db/semilla";
import type { SesionFila, TareaFila } from "@/lib/db/tipos";
import type { TipoTarea } from "@/lib/integrante/tipos";
import { AVISO_PROYECTO_DEMO, sesionEsDemo } from "@/lib/sesion/demo";
import { proyectosVisibles, tareasVisibles, type Visor } from "./alcance";
import { baseNoLista, json } from "./json";
import { tareaPublica } from "./tareas";

export function rechazoProyectoDemo(sesion: Pick<SesionFila, "email" | "usuarioId">): Response | null {
  if (!sesionEsDemo(sesion)) return null;
  return json({ aviso: AVISO_PROYECTO_DEMO }, 403);
}

export async function crearProyectoHttp(request: Request, almacen: Almacen, organizadorId: string): Promise<Response> {
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
    const fila = { ...proyecto.proyecto, organizadorId };
    await almacen.crearProyecto(fila, proyecto.tareas);
    return json({ proyecto: { id: fila.id, nombre: fila.nombre }, tareas: proyecto.tareas.map(tareaPublica) }, 201);
  } catch {
    return baseNoLista();
  }
}

export async function leerProyectoHttp(almacen: Almacen, visor: Visor): Promise<Response> {
  try {
    await asegurarSemilla(almacen);
    const proyectos = await proyectosVisibles(almacen, visor);
    const proyecto = proyectos[0] ?? null;
    if (!proyecto) return json({ aviso: "Todavía no hay un proyecto." }, 404);
    const tareas = (await tareasVisibles(almacen, visor)).filter((tarea) => tarea.proyectoId === proyecto.id);
    return json({
      proyecto: { id: proyecto.id, nombre: proyecto.nombre },
      proyectos: proyectos.map((item) => ({ id: item.id, nombre: item.nombre })),
      tareas: tareas.map(tareaPublica),
    });
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
