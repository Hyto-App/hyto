"use client";

import Link from "next/link";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { montoDeTarea } from "@/lib/integrante/formato";
import { etiquetaEstado, textoVisible } from "@/lib/ui/etiquetas";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";

export function TareasMiembro({
  tareas,
}: {
  tareas: { id: string; titulo: string; estado: string; tipo: TipoTarea; monto: string; tope: string | null }[];
}) {
  const t = useTexto();
  const idioma = useIdioma();
  if (tareas.length === 0) {
    return (
      <main className="hyto-page">
        <div className="hyto-card px-6 py-10">
          <p className="text-lg font-semibold">{t("eventos.noTasks")}</p>
          <p className="mt-2 text-sm text-[var(--suave)]">{t("eventos.assignedLater")}</p>
        </div>
      </main>
    );
  }
  return (
    <main className="hyto-page">
      <ul className="grid gap-3">
        {tareas.map((tarea) => (
          <li key={tarea.id}>
            <Link href={`/tareas/${tarea.id}`} className="hyto-card block p-5">
              <p className="text-lg font-semibold">{textoVisible(tarea.titulo, idioma)}</p>
              <p className="mt-1 text-sm text-[var(--suave)]">
                {etiquetaEstado(tarea.estado as EstadoTarea, idioma)} · {montoDeTarea(tarea, idioma)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
