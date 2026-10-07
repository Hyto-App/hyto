"use client";

import { useTexto } from "@/components/ui/Idioma";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Shown while a tab of an event (Inbox, Tasks, Report) is fetched on the server, so switching tabs
 * never leaves the previous tab's content on screen or a blank page.
 */
export default function CargandoEvento() {
  const t = useTexto();
  return (
    <div className="hyto-page" aria-busy="true" aria-live="polite">
      <p className="sr-only">{t("comunes.loading")}</p>
      <Skeleton alto={16} ancho={160} />
      <Skeleton alto={38} ancho="60%" className="mt-4" />
      <Skeleton alto={44} className="mt-6" />
      <div className="mt-6 grid gap-3">
        <Skeleton alto={96} radio={20} />
        <Skeleton alto={96} radio={20} />
        <Skeleton alto={96} radio={20} />
      </div>
    </div>
  );
}
