"use client";

import { useId } from "react";
import { useIdioma, useTexto } from "@/components/ui/Idioma";
import { seguimientoDe, type PasoActividad } from "@/lib/integrante/actividad";
import { ZONA_HORA } from "@/lib/integrante/formato";
import type { Tarea } from "@/lib/integrante/tipos";
import type { Clave } from "@/lib/ui/diccionario";

const PASO: Record<"revision" | "aprobada" | "enviado" | "pagado", Clave> = {
  revision: "actividad.revision",
  aprobada: "actividad.aprobada",
  enviado: "actividad.enviado",
  pagado: "actividad.pagado",
};

const EVENTO: Record<"envio" | "mile" | "aprobada" | "camino" | "pagado", Clave> = {
  envio: "actividad.envio",
  mile: "actividad.mile",
  aprobada: "actividad.aprobada",
  camino: "actividad.camino",
  pagado: "actividad.pagado",
};

function etiquetaHora(iso: string, idioma: "en" | "es"): string {
  return new Intl.DateTimeFormat(idioma === "es" ? "es-CR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: ZONA_HORA,
  }).format(new Date(iso));
}

/** The first step is named Approved only once the task is paid. Until then it shows the real status. */
function etiquetaPaso(paso: PasoActividad, tarea: Tarea): Clave {
  if (paso.id !== "aprobada" || paso.estado === "hecho") return PASO[paso.id];
  if (tarea.rechazada || tarea.etapa === "rechazada") return "tareas.badgeNewPhoto";
  if (tarea.estado === "en revisión") return "actividad.enRevision";
  return PASO[paso.id];
}

/** Three payment steps and the events we can actually date. */
export function ActividadTarea({ tarea }: { tarea: Tarea }) {
  const t = useTexto();
  const idioma = useIdioma();
  const { pasos, eventos } = seguimientoDe(tarea);
  const titulo = useId();

  return (
    <section className="hyto-tarjeta hyto-actividad" aria-labelledby={titulo}>
      <h2 id={titulo}>{t("actividad.titulo")}</h2>
      <ol className="hyto-rastreo" aria-label={t("actividad.rastreo")}>
        {pasos.map((paso) => (
          <li key={paso.id} data-estado={paso.estado} aria-current={paso.estado === "ahora" ? "step" : undefined}>
            {t(etiquetaPaso(paso, tarea))}
          </li>
        ))}
      </ol>
      {eventos.length === 0 ? <p className="hyto-actividad-vacio">{t("actividad.vacio")}</p> : null}
      {eventos.length > 0 ? (
        <ol className="hyto-bitacora">
          {eventos.map((evento) => (
            <li key={evento.id}>
              <span>{t(EVENTO[evento.id])}</span>
              {evento.en ? <time dateTime={evento.en}>{etiquetaHora(evento.en, idioma)}</time> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
