"use client";

import { useTexto } from "@/components/ui/Idioma";

/** The cover photo and the public description of an event. The AI context never reaches this component. */
export function ContextoEvento({
  proyectoId,
  nombre,
  descripcion,
  portada,
}: {
  proyectoId: string;
  nombre: string;
  descripcion: string | null;
  portada: boolean;
}) {
  const t = useTexto();
  if (!portada && !descripcion) return null;
  return (
    <section className="hyto-card mb-4 overflow-hidden" aria-label={nombre}>
      {portada ? (
        <div className="hyto-marco-16-9 rounded-b-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- private route, not a static asset */}
          <img src={`/api/eventos/${encodeURIComponent(proyectoId)}/portada`} alt={t("eventos.coverAlt", { name: nombre })} />
        </div>
      ) : null}
      {descripcion ? <p className="whitespace-pre-line px-5 py-4 text-sm leading-6 text-[var(--suave)]">{descripcion}</p> : null}
    </section>
  );
}
