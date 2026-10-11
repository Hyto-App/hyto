"use client";

import type { ReactNode } from "react";
import { PastillaEstado } from "@/components/integrante/EstadoTarea";
import { NotaCobro } from "@/components/integrante/NotaCobro";
import { NotasMileRejilla } from "@/components/integrante/evidencia/NotasMileRejilla";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import type { Tarea } from "@/lib/integrante/tipos";
import { etiquetaDesdeNota } from "@/lib/revision/pesos";
import { textoFalta } from "@/lib/revision/falta";
import { etiquetaVeredicto, textoNota } from "@/lib/ui/etiquetas";
import type { Veredicto } from "@/lib/admin/tipos";

const CLASE: Record<Veredicto, string> = {
  cumplió: "hyto-pill-ok",
  parcial: "hyto-pill-mid",
  insuficiente: "hyto-pill-bad",
};

/** The result card: one centered column. Percentage, state, amount, Mile's flags, then what is missing. */
export function ResumenResultado({
  tarea,
  titulo,
  calificacion,
  montoVisible,
  miniatura,
  meta,
  mostrarLlamada = true,
}: {
  tarea: Tarea;
  titulo: ReactNode;
  calificacion: { veredicto: Veredicto; nota: number | null } | null;
  montoVisible: string;
  miniatura?: ReactNode;
  meta?: ReactNode;
  mostrarLlamada?: boolean;
}) {
  const t = useTexto();
  const idioma = useIdioma();
  const falta = calificacion ? textoFalta(tarea.notas, idioma) : null;
  const banda = calificacion ? (typeof calificacion.nota === "number" ? etiquetaDesdeNota(calificacion.nota) : calificacion.veredicto) : null;
  const estado = banda ? etiquetaVeredicto(banda, idioma) : null;
  return (
    <article className="hyto-tarjeta hyto-resumen">
      {miniatura ? <div className="hyto-resumen-mini">{miniatura}</div> : null}
      <PastillaEstado estado={tarea.estado} />
      <h2>{titulo}</h2>
      {meta}
      {calificacion && banda && estado ? (
        <div className="hyto-resumen-nota" role="group" aria-label={textoNota(estado, calificacion.nota)}>
          {typeof calificacion.nota === "number" ? (
            <p className={`hyto-resumen-pct ${CLASE[banda]}`} aria-hidden="true">
              {calificacion.nota}%
            </p>
          ) : null}
          <p className={`hyto-resumen-estado ${CLASE[banda]}`} aria-hidden="true">
            {estado}
          </p>
          <span className="sr-only">{textoNota(estado, calificacion.nota)}</span>
        </div>
      ) : null}
      {montoVisible ? <p className="hyto-amount">{montoVisible}</p> : null}
      {calificacion ? <NotasMileRejilla etiquetas={tarea.notas} /> : null}
      {calificacion ? <NotaCobro tarea={tarea} /> : null}
      {calificacion && mostrarLlamada ? <p className="hyto-tarea-meta">{t("evidencia.organizerCall")}.</p> : null}
      {falta ? (
        <p role="note" className="hyto-resumen-falta">
          {falta}
        </p>
      ) : null}
    </article>
  );
}
