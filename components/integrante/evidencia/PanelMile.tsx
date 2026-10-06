"use client";

import { MileAnimada } from "@/components/ui/MileAnimada";
import { useTexto } from "@/components/ui/Idioma";

/** Mile resting on his chest: "Before you send it, I check your photo". */
export function PanelMile() {
  const t = useTexto();
  return (
    <section className="hyto-tarjeta hyto-tarjeta-heroe hyto-panel-mile">
      <MileAnimada estado="reposo" tamano={120} />
      <div>
        <p className="hyto-eyebrow">{t("evidencia.mileHi")}</p>
        <h2>{t("evidencia.mileCheck")}</h2>
        <p>{t("evidencia.mileWhy")}</p>
      </div>
    </section>
  );
}
