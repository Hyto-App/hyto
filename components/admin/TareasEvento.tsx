"use client";

import { useState } from "react";
import { montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaEstado, textoVisible } from "@/lib/ui/etiquetas";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";

export type FilaTareaEvento = {
  id: string;
  titulo: string;
  tipo: TipoTarea;
  monto: string;
  tope: string | null;
  estado: string;
  miembroId: string;
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
        {filas.map((tarea) => (
          <li key={tarea.id} className="hyto-card grid gap-3 p-5 sm:grid-cols-[1fr_16rem] sm:items-center">
            <div>
              <p className="text-lg font-semibold">{textoVisible(tarea.titulo)}</p>
              <p className="mt-1 text-sm text-[var(--suave)]">
                {etiquetaEstado(tarea.estado as EstadoTarea)} · {montoDeTarea(tarea)}
              </p>
            </div>
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
          </li>
        ))}
      </ul>
      {aviso ? (
        <p role="alert" className="mt-4 text-sm text-[var(--peligro)]">
          {aviso}
        </p>
      ) : null}
    </main>
  );
}
