"use client";

import Link from "next/link";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { Mile } from "@/components/ui/Mile";
import { lineaMontoTarea } from "@/lib/integrante/formato";
import { fraseComisionEvento } from "@/lib/ui/comision-evento";
import { etiquetaEstado, textoVisible } from "@/lib/ui/etiquetas";
import type { EstadoTarea, TipoTarea } from "@/lib/integrante/tipos";

export function TareasMiembro({
  tareas,
}: {
  tareas: {
    id: string;
    titulo: string;
    estado: string;
    tipo: TipoTarea;
    monto: string;
    tope: string | null;
    montoConfirmado?: string | null;
    montoRevisado?: string | null;
  }[];
}) {
  const t = useTexto();
  const idioma = useIdioma();
  if (tareas.length === 0) {
    return (
      <main className="hyto-page hyto-tareas-lista">
        <div className="hyto-card hyto-estado-vacio">
          <Mile estado="icono" tamano={72} />
          <h2>{t("eventos.noTasks")}</h2>
          <p>{t("eventos.assignedLater")}</p>
        </div>
      </main>
    );
  }
  return (
    <main className="hyto-page hyto-tareas-lista">
      <ul className="hyto-lista-eventos">
        {tareas.map((tarea) => {
          const comision = tarea.estado === "pagado" ? null : fraseComisionEvento(tarea.tipo === "reembolso" ? (tarea.tope ?? tarea.monto) : tarea.monto, idioma);
          return (
            <li key={tarea.id}>
              <Link href={`/tareas/${tarea.id}`} className="hyto-card hyto-evento-fila hyto-aparecer">
                <span className="hyto-evento-nombre">{textoVisible(tarea.titulo, idioma)}</span>
                <span className="hyto-evento-meta">
                  {etiquetaEstado(tarea.estado as EstadoTarea, idioma)} · {lineaMontoTarea(tarea, idioma, (amount) => t("eventos.limit", { amount }))}
                </span>
                {comision ? <span className="hyto-comision">{comision}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
