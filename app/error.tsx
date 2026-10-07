"use client";

import { useTexto } from "@/components/ui/Idioma";

export default function ErrorPantalla({ reset }: { error: Error; reset: () => void }) {
  const t = useTexto();
  return (
    <main className="hyto-page mx-auto max-w-lg">
      <h1 className="hyto-title">{t("error.titulo")}</h1>
      <p className="hyto-sub">{t("error.cuerpo")}</p>
      <button type="button" className="hyto-btn mt-6 max-w-xs" onClick={() => reset()}>
        {t("error.reintentar")}
      </button>
    </main>
  );
}
