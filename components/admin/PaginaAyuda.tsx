"use client";

import { useMemo } from "react";
import { useTexto } from "@/components/ui/Idioma";
import { PREGUNTAS, type PreguntaVisible } from "@/lib/ui/ayuda";

/** The same answers as Mile's help, on a page a notice can link to. */
export function PaginaAyuda() {
  const t = useTexto();
  const preguntas = useMemo<PreguntaVisible[]>(
    () =>
      PREGUNTAS.map((id) => ({
        id,
        pregunta: t(`ayuda.${id}Q`),
        respuesta: t(`ayuda.${id}A`),
      })),
    [t],
  );

  return (
    <main className="hyto-page">
      <h1 className="text-2xl font-semibold tracking-tight">{t("nav.helpFaq")}</h1>
      <div className="mt-6 grid gap-4">
        {preguntas.map((item) => (
          <section key={item.id} className="hyto-card p-5 sm:p-6">
            <h2 className="text-sm font-medium">{item.pregunta}</h2>
            <p className="mt-2 max-w-prose text-sm leading-6 text-[var(--suave)]">{item.respuesta}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
