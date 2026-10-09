"use client";

import { useState } from "react";
import { Mile } from "@/components/ui/Mile";
import { useTexto } from "@/components/ui/Idioma";

/** One line from Mile, then the rest. The chest stays at rest. No chat bubble. */
export function PanelMile() {
  const t = useTexto();
  const [mas, setMas] = useState(false);
  return (
    <section className="hyto-tarjeta hyto-tarjeta-heroe hyto-panel-mile">
      <Mile estado="descansando" tamano={96} className="hyto-mile-prominente" />
      <div className="hyto-panel-mile-nota">
        <p className={mas ? "is-abierta" : undefined}>
          {t("evidencia.mileCheck")}
          {mas ? ` ${t("evidencia.mileWhy")}` : null}
        </p>
        {mas ? null : (
          <button type="button" className="hyto-nota-mile-mas" onClick={() => setMas(true)}>
            {t("comunes.seeMore")}
          </button>
        )}
      </div>
    </section>
  );
}
