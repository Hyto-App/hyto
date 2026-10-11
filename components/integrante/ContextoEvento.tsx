"use client";

import { useIdioma, useTexto } from "@/components/ui/Idioma";

/** The cover photo and the public description of an event. The AI context never reaches this component. */
export function ContextoEvento({
  proyectoId,
  nombre,
  descripcion,
  portada,
  fecha = null,
}: {
  proyectoId: string;
  nombre: string;
  descripcion: string | null;
  portada: boolean;
  /** «¿Para cuándo?» as YYYY-MM-DD, or null. */
  fecha?: string | null;
}) {
  const t = useTexto();
  const idioma = useIdioma();
  if (!portada && !descripcion && !fecha) return null;
  const dia = fecha
    ? new Intl.DateTimeFormat(idioma === "es" ? "es-CR" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${fecha}T00:00:00Z`),
      )
    : null;
  return (
    <section className="hyto-card mb-4 overflow-hidden" aria-label={nombre}>
      {portada ? (
        <div className="hyto-marco-16-9 rounded-b-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- private route, not a static asset */}
          <img src={`/api/eventos/${encodeURIComponent(proyectoId)}/portada`} alt={t("eventos.coverAlt", { name: nombre })} />
        </div>
      ) : null}
      {descripcion ? <p className="whitespace-pre-line px-5 py-4 text-sm leading-6 text-[var(--suave)]">{descripcion}</p> : null}
      {dia ? <p className={`px-5 pb-4 text-sm font-medium${descripcion ? "" : " pt-4"}`}>{t("crear.paraElDia", { fecha: dia })}</p> : null}
    </section>
  );
}
