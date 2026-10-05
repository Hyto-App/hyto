"use client";

import { useTexto } from "@/components/ui/Idioma";
import { puntosDeCondicion } from "@/lib/integrante/puntos";

/** "Your photo must show": numbered points. Presentation only, no per-point result (spec §6.2). */
export function Checklist({ condicion, revisando = false }: { condicion: string; revisando?: boolean }) {
  const t = useTexto();
  const puntos = puntosDeCondicion(condicion);
  if (puntos.length === 0) return null;
  return (
    <section className="hyto-tarjeta hyto-checklist" aria-labelledby="hyto-checklist-titulo">
      <h2 id="hyto-checklist-titulo">{t("evidencia.mustShow")}</h2>
      <ol>
        {puntos.map((punto, indice) => (
          <li key={`${indice}-${punto}`}>
            {revisando ? <i className="hyto-punto-espera" aria-hidden="true" /> : <span className="hyto-punto-num" aria-hidden="true">{indice + 1}</span>}
            <span>{punto}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
