import type { Decision, MemoriaAdmin, ProyectoCreado, TareaCreada } from "./tipos";
import type { TipoTarea } from "@/lib/integrante/tipos";

const CLAVE = "hyto-admin";

const VACIA: MemoriaAdmin = {
  decisiones: {},
  proyecto: null,
  direccion: null,
};

function puedeGuardar(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function esTipo(valor: unknown): valor is TipoTarea {
  return valor === "trabajo" || valor === "reembolso";
}

function leerTarea(valor: unknown): TareaCreada | null {
  if (!valor || typeof valor !== "object") return null;
  const crudo = valor as Record<string, unknown>;
  if (typeof crudo.id !== "string" || typeof crudo.titulo !== "string" || typeof crudo.monto !== "string") return null;
  if (!esTipo(crudo.tipo)) return null;
  return { id: crudo.id, titulo: crudo.titulo, tipo: crudo.tipo, monto: crudo.monto };
}

function leerProyecto(valor: unknown): ProyectoCreado | null {
  if (!valor || typeof valor !== "object") return null;
  const crudo = valor as Record<string, unknown>;
  if (typeof crudo.nombre !== "string" || !Array.isArray(crudo.tareas)) return null;
  const tareas = crudo.tareas.map(leerTarea).filter((tarea): tarea is TareaCreada => tarea !== null);
  if (!crudo.nombre.trim() || tareas.length === 0) return null;
  return { nombre: crudo.nombre, tareas };
}

function leerDecisiones(valor: unknown): Record<string, Decision> {
  if (!valor || typeof valor !== "object") return {};
  const decisiones: Record<string, Decision> = {};
  for (const [id, decision] of Object.entries(valor)) {
    if (decision === "pagado" || decision === "pendiente") decisiones[id] = decision;
  }
  return decisiones;
}

export function leerMemoriaAdmin(): MemoriaAdmin {
  if (!puedeGuardar()) return { decisiones: {}, proyecto: null, direccion: null };
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return { decisiones: {}, proyecto: null, direccion: null };
    const json = JSON.parse(crudo) as Partial<MemoriaAdmin>;
    return {
      decisiones: leerDecisiones(json.decisiones),
      proyecto: leerProyecto(json.proyecto),
      direccion: typeof json.direccion === "string" && json.direccion.trim() ? json.direccion : null,
    };
  } catch {
    return { decisiones: {}, proyecto: null, direccion: null };
  }
}

function escribir(memoria: MemoriaAdmin) {
  if (!puedeGuardar()) return;
  window.localStorage.setItem(CLAVE, JSON.stringify(memoria));
}

export function guardarDecision(tareaId: string, decision: Decision): MemoriaAdmin {
  const memoria = leerMemoriaAdmin();
  memoria.decisiones[tareaId] = decision;
  escribir(memoria);
  return memoria;
}

export function guardarProyecto(proyecto: ProyectoCreado): MemoriaAdmin {
  const memoria = { ...VACIA, direccion: leerMemoriaAdmin().direccion, proyecto };
  escribir(memoria);
  return memoria;
}

export function volverAlEjemplo(): MemoriaAdmin {
  const memoria = leerMemoriaAdmin();
  memoria.proyecto = null;
  memoria.decisiones = {};
  escribir(memoria);
  return memoria;
}

export function guardarDireccionAdmin(direccion: string): MemoriaAdmin {
  const memoria = leerMemoriaAdmin();
  memoria.direccion = direccion;
  escribir(memoria);
  return memoria;
}
