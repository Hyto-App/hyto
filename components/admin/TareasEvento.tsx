"use client";

import { useState } from "react";
import { montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaDificultad, etiquetaEstado, etiquetaPrioridad, textoVisible } from "@/lib/ui/etiquetas";
import type { DificultadTarea, EstadoTarea, PrioridadTarea, TipoTarea } from "@/lib/integrante/tipos";

export type FilaTareaEvento = {
  id: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  tope: string | null;
  estado: string;
  miembroId: string;
  prioridad: PrioridadTarea;
  dificultad: DificultadTarea | null;
};

export function TareasEvento({
  tareas,
  miembros,
}: {
  tareas: FilaTareaEvento[];
  miembros: { usuarioId: string; email: string }[];
}) {
  const [filas, setFilas] = useState(tareas);
  const [aviso, setAviso] = useState<string | null>(null);

  async function asignar(tareaId: string, usuarioId: string) {
    setAviso(null);
    const respuesta = await fetch(`/api/tareas/${encodeURIComponent(tareaId)}/asignar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usuarioId }),
    });
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
      setAviso(cuerpo?.aviso ?? "Could not assign that task.");
      return;
    }
    setFilas((actuales) => actuales.map((fila) => (fila.id === tareaId ? { ...fila, miembroId: usuarioId } : fila)));
  }

  async function clasificar(tareaId: string, cambio: { prioridad?: PrioridadTarea; dificultad?: DificultadTarea | null }) {
    setAviso(null);
    const previa = filas.find((fila) => fila.id === tareaId);
    setFilas((actuales) => actuales.map((fila) => (fila.id === tareaId ? { ...fila, ...cambio } : fila)));
    const respuesta = await fetch(`/api/tareas/${encodeURIComponent(tareaId)}/clasificar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cambio),
    });
    if (!respuesta.ok) {
      if (previa) {
        setFilas((actuales) => actuales.map((fila) => (fila.id === tareaId ? { ...fila, prioridad: previa.prioridad, dificultad: previa.dificultad } : fila)));
      }
      const cuerpo = (await respuesta.json().catch(() => null)) as { aviso?: string } | null;
      setAviso(cuerpo?.aviso ?? "Could not save priority and difficulty.");
    }
  }

  if (filas.length === 0) {
    return (
      <main className="hyto-page">
        <p className="text-lg font-semibold">No tasks yet.</p>
      </main>
    );
  }

  return (
    <main className="hyto-page">
      <ul className="grid gap-3">
        {filas.map((tarea) => {
          const prioridad = etiquetaPrioridad(tarea.prioridad);
          const dificultad = etiquetaDificultad(tarea.dificultad);
          return (
            <li key={tarea.id} className="hyto-card grid gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold">{textoVisible(tarea.titulo)}</p>
                <p className="mt-1 text-sm text-[var(--suave)]">
                  {etiquetaEstado(tarea.estado as EstadoTarea)} · {montoDeTarea(tarea)}
                </p>
                {prioridad || dificultad ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {prioridad ? (
                      <span className="hyto-pill hyto-pill-ok">
                        <i className="hyto-dot" aria-hidden="true" />
                        {prioridad}
                      </span>
                    ) : null}
                    {dificultad ? (
                      <span className="hyto-pill hyto-pill-muted">
                        <i className="hyto-dot" aria-hidden="true" />
                        {dificultad}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-sm" htmlFor={`prioridad-${tarea.id}`}>
                Priority
                <select
                  id={`prioridad-${tarea.id}`}
                  className="hyto-input mt-2"
                  value={tarea.prioridad}
                  onChange={(evento) => void clasificar(tarea.id, { prioridad: evento.target.value as PrioridadTarea })}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="text-sm" htmlFor={`dificultad-${tarea.id}`}>
                Difficulty
                <select
                  id={`dificultad-${tarea.id}`}
                  className="hyto-input mt-2"
                  value={tarea.dificultad ?? ""}
                  onChange={(evento) =>
                    void clasificar(tarea.id, { dificultad: evento.target.value === "" ? null : (evento.target.value as DificultadTarea) })
                  }
                >
                  <option value="">Not set</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label className="text-sm" htmlFor={`asignar-${tarea.id}`}>
                Assign
                <select
                  id={`asignar-${tarea.id}`}
                  className="hyto-input mt-2"
                  value={tarea.miembroId}
                  onChange={(evento) => void asignar(tarea.id, evento.target.value)}
                >
                  <option value="">Unassigned</option>
                  {miembros.map((persona) => (
                    <option key={persona.usuarioId} value={persona.usuarioId}>
                      {persona.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            </li>
          );
        })}
      </ul>
      {aviso ? (
        <p role="alert" className="mt-4 text-sm text-[var(--peligro)]">
          {aviso}
        </p>
      ) : null}
    </main>
  );
}
