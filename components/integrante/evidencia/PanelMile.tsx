"use client";

import { Mile } from "@/components/ui/Mile";
import { useTexto } from "@/components/ui/Idioma";

/** Mile resting on his chest: "Before you send it, I check your photo". */
export function PanelMile() {
  const t = useTexto();
  return (
    <section className="hyto-tarjeta hyto-tarjeta-heroe hyto-panel-mile">
      <Mile estado="descansando" tamano={120} halo />
      <div>
        <p className="hyto-eyebrow">{t("evidencia.mileHi")}</p>
        <h2>{t("evidencia.mileCheck")}</h2>
        <p>{t("evidencia.mileWhy")}</p>
      </div>
    </section>
  );
}
